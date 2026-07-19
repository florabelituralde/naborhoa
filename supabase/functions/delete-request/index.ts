import { createClientFromRequest } from '../_shared/base44-compat.ts';
import { withCors } from '../_shared/cors.ts';

// Lets a homeowner delete their own request, but ONLY when the HOA/board has
// not yet acted on it (status still "submitted" and no HOA action in the
// activity log). HOA admins/board members cannot delete requests at all.
// Runs as the service role (RLS delete is locked down) and enforces the
// business rule here so it cannot be bypassed from the client.
Deno.serve(withCors(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => null);
    if (!body) return Response.json({ error: 'Invalid request body' }, { status: 400 });
    const { request_id } = body;
    if (!request_id) return Response.json({ error: 'Missing request_id' }, { status: 400 });

    const found = await base44.asServiceRole.entities.Request.filter({ id: request_id });
    const request = found[0];
    if (!request) return Response.json({ error: 'Request not found' }, { status: 404 });
    if (request.homeowner_id !== caller.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const HOA_ACTION_TYPES = ['status_change', 'assigned', 'unassigned', 'note'];
    const hasHoaAction = (request.activity_log || []).some((e) => HOA_ACTION_TYPES.includes(e.type));
    if (request.status !== 'submitted' || hasHoaAction) {
      return Response.json(
        { error: 'This request has already been acted on and cannot be deleted.' },
        { status: 400 }
      );
    }

    await base44.asServiceRole.entities.Request.delete(request_id);
    return Response.json({ ok: true });
  } catch (error) {
    console.error('delete-request error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}));