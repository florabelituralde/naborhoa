// Base44-compatible client backed by Supabase.
//
// This module preserves the exact surface the app already uses
// (`base44.entities.*`, `base44.auth.*`, `base44.functions.invoke`,
// `base44.integrations.Core.*`) so the rest of the codebase did not need to be
// rewritten when we migrated off Base44. Everything is implemented on top of
// `@supabase/supabase-js`.
import { supabase } from '@/api/supabaseClient';
import { ENTITY_TABLES } from '@/api/entityTables';

// ---------------------------------------------------------------------------
// Current auth user cache (used to stamp created_by / created_by_id on inserts,
// mirroring Base44's automatic ownership fields).
// ---------------------------------------------------------------------------
let cachedAuth = null;
supabase.auth.onAuthStateChange((_event, session) => {
  cachedAuth = session?.user ? { id: session.user.id, email: session.user.email } : null;
});

async function getCurrentAuth() {
  if (cachedAuth) return cachedAuth;
  const { data } = await supabase.auth.getUser();
  cachedAuth = data?.user ? { id: data.user.id, email: data.user.email } : null;
  return cachedAuth;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function throwIf(error) {
  if (error) {
    const e = /** @type {any} */ (new Error(error.message || 'Request failed'));
    if (error.code) e.code = error.code;
    if (error.status) e.status = error.status;
    throw e;
  }
}

// "-created_date" => order by created_date desc; "created_date" => asc.
function applySort(query, sort) {
  if (!sort) return query;
  const descending = sort.startsWith('-');
  const column = descending ? sort.slice(1) : sort;
  return query.order(column, { ascending: !descending });
}

// Translate a Base44 filter object onto a supabase query builder.
// Supports equality, arrays (IN), null (IS NULL) and a few Mongo-style operators.
function applyFilter(query, filters) {
  for (const [key, value] of Object.entries(filters || {})) {
    if (Array.isArray(value)) {
      query = query.in(key, value);
    } else if (value === null) {
      query = query.is(key, null);
    } else if (value && typeof value === 'object') {
      if ('$in' in value) query = query.in(key, value.$in);
      if ('$gt' in value) query = query.gt(key, value.$gt);
      if ('$gte' in value) query = query.gte(key, value.$gte);
      if ('$lt' in value) query = query.lt(key, value.$lt);
      if ('$lte' in value) query = query.lte(key, value.$lte);
      if ('$ne' in value) query = query.neq(key, value.$ne);
      if ('$contains' in value) query = query.ilike(key, `%${value.$contains}%`);
    } else {
      query = query.eq(key, value);
    }
  }
  return query;
}

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------
function makeEntity(entityName) {
  const table = ENTITY_TABLES[entityName] || entityName.toLowerCase();

  return {
    async list(sort = '-created_date', limit) {
      let query = supabase.from(table).select('*');
      query = applySort(query, sort);
      if (limit) query = query.limit(limit);
      const { data, error } = await query;
      throwIf(error);
      return data || [];
    },

    async filter(filters = {}, sort = '-created_date', limit) {
      let query = supabase.from(table).select('*');
      query = applyFilter(query, filters);
      query = applySort(query, sort);
      if (limit) query = query.limit(limit);
      const { data, error } = await query;
      throwIf(error);
      return data || [];
    },

    async get(id) {
      const { data, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
      throwIf(error);
      if (!data) {
        const e = /** @type {any} */ (new Error(`${entityName} not found`));
        e.status = 404;
        throw e;
      }
      return data;
    },

    async create(values) {
      const currentAuth = await getCurrentAuth();
      const row = {
        ...(currentAuth ? { created_by_id: currentAuth.id, created_by: currentAuth.email } : {}),
        ...values,
      };
      const { data, error } = await supabase.from(table).insert(row).select().single();
      throwIf(error);
      return data;
    },

    async bulkCreate(rows) {
      const currentAuth = await getCurrentAuth();
      const payload = (rows || []).map((values) => ({
        ...(currentAuth ? { created_by_id: currentAuth.id, created_by: currentAuth.email } : {}),
        ...values,
      }));
      const { data, error } = await supabase.from(table).insert(payload).select();
      throwIf(error);
      return data || [];
    },

    async update(id, values) {
      const patch = { ...values };
      delete patch.id;
      delete patch.created_date;
      const { data, error } = await supabase.from(table).update(patch).eq('id', id).select().single();
      throwIf(error);
      return data;
    },

    async bulkUpdate(rows) {
      const results = [];
      for (const { id, ...values } of rows || []) {
        const patch = { ...values };
        delete patch.created_date;
        const { data, error } = await supabase.from(table).update(patch).eq('id', id).select().single();
        throwIf(error);
        results.push(data);
      }
      return results;
    },

    async delete(id) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      throwIf(error);
      return { id };
    },

    // Realtime subscription. Calls `callback` on any insert/update/delete and
    // returns an unsubscribe function (matches Base44's `subscribe` contract).
    subscribe(callback) {
      const channel = supabase
        .channel(`realtime-${table}-${Math.random().toString(36).slice(2)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
          try {
            callback(payload);
          } catch {
            /* ignore subscriber errors */
          }
        })
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    },
  };
}

const entities = new Proxy(
  {},
  {
    get(cache, prop) {
      if (typeof prop !== 'string') return undefined;
      if (!cache[prop]) cache[prop] = makeEntity(prop);
      return cache[prop];
    },
  }
);

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
const auth = {
  // Returns the current user merged with their profile row, or throws when not
  // signed in (callers treat a throw as "auth required").
  async me() {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
      const e = /** @type {any} */ (new Error('Not authenticated'));
      e.status = 401;
      throw e;
    }
    const user = data.user;
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    return { ...(profile || {}), id: user.id, email: user.email };
  },

  async loginViaEmailPassword(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  loginWithProvider(provider, redirectTo = '/') {
    const redirect = `${window.location.origin}${redirectTo.startsWith('/') ? redirectTo : `/${redirectTo}`}`;
    return supabase.auth.signInWithOAuth({ provider, options: { redirectTo: redirect } });
  },

  // Optional extra fields (e.g. full_name) are stored in user metadata and
  // copied into the profile row by the `handle_new_user` trigger.
  async register({ email, password, ...metadata }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata, emailRedirectTo: window.location.origin },
    });
    if (error) throw error;
    return data;
  },

  // Confirms a newly-registered email using the 6-digit code from the signup
  // email. Requires the Supabase "Confirm signup" template to send {{ .Token }}.
  async verifyOtp({ email, otpCode }) {
    const { data, error } = await supabase.auth.verifyOtp({ email, token: otpCode, type: 'signup' });
    if (error) throw error;
    return { access_token: data.session?.access_token, session: data.session, user: data.user };
  },

  async resendOtp(email) {
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) throw error;
    return { success: true };
  },

  async resetPasswordRequest(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
    return { success: true };
  },

  // The reset email must link to /reset-password?token={{ .TokenHash }} so we can
  // exchange the token for a session and then set the new password.
  async resetPassword({ resetToken, newPassword }) {
    if (resetToken) {
      const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: resetToken, type: 'recovery' });
      if (verifyError) throw verifyError;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    return { success: true };
  },

  async updateMe(values) {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) throw new Error('Not authenticated');
    const patch = { ...values };
    delete patch.id;
    delete patch.email;
    const { data: profile, error: upErr } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', data.user.id)
      .select()
      .single();
    if (upErr) throw upErr;
    return profile;
  },

  // Supabase manages the session for us after verifyOtp/signIn, so this is a
  // no-op kept for API compatibility.
  setToken() {},

  async logout(redirectUrl) {
    await supabase.auth.signOut();
    if (redirectUrl !== undefined) {
      window.location.href = '/login';
    }
  },

  redirectToLogin(_returnTo) {
    window.location.href = '/login';
  },
};

// ---------------------------------------------------------------------------
// Functions (Supabase Edge Functions)
// ---------------------------------------------------------------------------
async function extractFunctionError(error) {
  let message = error?.message || 'Function error';
  try {
    const ctx = error?.context;
    if (ctx && typeof ctx.json === 'function') {
      const body = await ctx.clone().json();
      if (body?.error) message = body.error;
      else if (typeof body === 'string') message = body;
    }
  } catch {
    /* fall back to error.message */
  }
  const e = /** @type {any} */ (new Error(message));
  if (error?.context?.status) e.status = error.context.status;
  return e;
}

const functions = {
  // Returns { data } on success (matching how callers read `res.data`) and
  // throws Error(serverMessage) on failure (matching `catch (err) => err.message`).
  async invoke(name, body = {}) {
    const { data, error } = await supabase.functions.invoke(name, { body });
    if (error) throw await extractFunctionError(error);
    return { data };
  },
};

// ---------------------------------------------------------------------------
// Integrations (formerly Base44 Core integrations)
// ---------------------------------------------------------------------------
async function callIntegration(fnName, payload) {
  const { data, error } = await supabase.functions.invoke(fnName, { body: payload || {} });
  if (error) throw await extractFunctionError(error);
  return data;
}

const integrations = {
  Core: {
    // Uploads to the public `uploads` storage bucket and returns a public URL,
    // matching Base44's UploadFile({ file }) -> { file_url }.
    async UploadFile({ file }) {
      const safeName = (file?.name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
      const objectPath = `${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`;
      const { error } = await supabase.storage
        .from('uploads')
        .upload(objectPath, file, { contentType: file?.type || undefined, upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from('uploads').getPublicUrl(objectPath);
      return { file_url: data.publicUrl };
    },

    InvokeLLM(payload) {
      return callIntegration('invoke-llm', payload);
    },

    SendEmail(payload) {
      return callIntegration('send-email', payload);
    },

    ExtractDataFromUploadedFile(payload) {
      return callIntegration('extract-data', payload);
    },
  },
};

// ---------------------------------------------------------------------------
export const base44 = {
  entities,
  auth,
  functions,
  integrations,
  // Direct access to the underlying Supabase client when needed.
  supabase,
};

export default base44;
