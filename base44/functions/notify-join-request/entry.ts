import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Notify a community's approvers (admin, staff, and approved board members)
// when a homeowner submits a new membership (join) request.
// A homeowner cannot write Notifications to other users directly, so this runs
// with the service role.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => null);
    if (!body) return Response.json({ error: 'Invalid request body' }, { status: 400 });
    const { request_id } = body;
    if (!request_id) return Response.json({ error: 'Missing request_id' }, { status: 400 });

    const joinRequest = await base44.asServiceRole.entities.JoinRequest
      .get(request_id)
      .catch(() => null);
    if (!joinRequest) return Response.json({ error: 'Request not found' }, { status: 404 });

    // Only the homeowner who created the request may trigger the notification.
    if (joinRequest.homeowner_id !== user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const communityId = joinRequest.community_id;

    // Approvers: hoa_admin / hoa_staff, plus approved board-member homeowners.
    const staff = await base44.asServiceRole.entities.User.filter({ community_id: communityId });
    const approvers = staff.filter(
      (u) =>
        u.role === 'hoa_admin' ||
        u.role === 'hoa_staff' ||
        (u.role === 'homeowner' && u.board_member_status === 'approved'),
    );

    if (approvers.length > 0) {
      await base44.asServiceRole.entities.Notification.bulkCreate(
        approvers.map((u) => ({
          community_id: communityId,
          user_id: u.id,
          type: 'membership_request',
          title: 'New membership request',
          body: `${joinRequest.homeowner_name || 'A homeowner'} requested to join at ${joinRequest.address}.`,
          related_id: request_id,
        })),
      );
    }

    return Response.json({ notified: approvers.length });
  } catch (error) {
    console.error('notify-join-request error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});