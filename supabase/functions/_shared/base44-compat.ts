// Drop-in replacement for `@base44/sdk`'s createClientFromRequest used by the
// ported edge functions. It exposes the small slice of the Base44 server SDK
// the functions actually use:
//   base44.auth.me()
//   base44.asServiceRole.entities.<Entity>.<list|filter|get|create|update|delete|bulkCreate|bulkUpdate>
//   base44.asServiceRole.integrations.Core.<InvokeLLM|SendEmail|ExtractDataFromUploadedFile>
//
// Ported functions only need to change their import line from
//   import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
// to
//   import { createClientFromRequest } from '../_shared/base44-compat.ts';
import { serviceClient } from './supabase.ts';
import { makeEntities } from './entities.ts';
import { invokeLLM, sendEmail, extractData } from './integrations.ts';

export function createClientFromRequest(req: Request) {
  const svc = serviceClient();
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  const auth = {
    // Returns the calling user's merged auth + profile record, or null when the
    // request carries no valid session (functions check `if (!user) 401`).
    async me() {
      if (!token) return null;
      const { data, error } = await svc.auth.getUser(token);
      if (error || !data?.user) return null;
      const u = data.user;
      const { data: profile } = await svc.from('profiles').select('*').eq('id', u.id).maybeSingle();
      return { ...(profile || {}), id: u.id, email: u.email };
    },
  };

  const integrations = {
    Core: {
      InvokeLLM: invokeLLM,
      SendEmail: sendEmail,
      ExtractDataFromUploadedFile: extractData,
    },
  };

  const asServiceRole = {
    entities: makeEntities(svc),
    integrations,
    auth,
  };

  return {
    auth,
    asServiceRole,
    integrations,
    entities: makeEntities(svc),
    supabase: svc,
  };
}
