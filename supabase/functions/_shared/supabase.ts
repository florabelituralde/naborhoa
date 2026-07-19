// Service-role Supabase client for edge functions. It bypasses RLS, so only
// use it in trusted server code. The SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
// env vars are injected automatically into every Supabase Edge Function.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

export function serviceClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the function environment.');
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
