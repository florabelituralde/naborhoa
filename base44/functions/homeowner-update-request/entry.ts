import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Lets a homeowner update their own request (edit + resubmit). The request
// update could run client-side, but the homeowner cannot create notifications
// (admin-only), so this function also notifies the community's HOA
// admins/staff and approved board members. Runs as the service role so it can
// write notifications and apply the update regardless of the caller's role.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { request_id, title, description, contact_phone, contact_email, attachments } = body;
    if (!request_id) return Response.json({ error: 'Missing request_id' }, { status: 400 });

    const found = await base44.asServiceRole.entities.Request.filter({ id: request_id });
    const request = found[0];
    if (!request) return Response.json({ error: 'Request not found' }, { status: 404 });
    if (request.homeowner_id !== caller.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Homeowners may only edit while the request is still open for changes.
    if (request.status !== 'submitted' && request.status !== 'info_requested') {
      return Response.json({ error: 'This request can no longer be edited' }, { status: 400 });
    }

    const wasInfoRequested = request.status === 'info_requested';
    const now = new Date().toISOString();
    const entry = {
      type: 'homeowner_update',
      label: wasInfoRequested ? 'Homeowner resubmitted with updates' : 'Homeowner updated the request',
      actor_name: caller.full_name || 'Homeowner',
      timestamp: now,
    };

    const update = {
      title: typeof title === 'string' ? title : request.title,
      description: typeof description === 'string' ? description : request.description,
      contact_phone: typeof contact_phone === 'string' ? contact_phone : request.contact_phone,
      contact_email: typeof contact_email === 'string' ? contact_email : request.contact_email,
      attachments: Array.isArray(attachments) ? attachments : request.attachments,
      activity_log: [...(request.activity_log || []), entry],
    };
    if (wasInfoRequested) update.status = 'submitted';

    const updated = await base44.asServiceRole.entities.Request.update(request_id, update);

    // Notify HOA admins/staff and approved board members in the community.
    try {
      const users = await base44.asServiceRole.entities.User.filter({ community_id: request.community_id });
      const recipients = users.filter(
        (u) => u.role === 'hoa_admin' || u.role === 'hoa_staff' || u.board_member_status === 'approved'
      );
      const noteBody = wasInfoRequested
        ? 'Homeowner resubmitted with updates — ready for your review.'
        : 'Homeowner updated the request.';
      for (const r of recipients) {
        await base44.asServiceRole.entities.Notification.create({
          community_id: request.community_id,
          user_id: r.id,
          type: 'request_update',
          title: `Request "${request.title}" updated by homeowner`,
          body: noteBody,
          related_id: request_id,
        });
      }
    } catch (e) {
      console.error('homeowner-update-request notify error:', e.message);
    }

    return Response.json({ request: updated });
  } catch (error) {
    console.error('homeowner-update-request error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});