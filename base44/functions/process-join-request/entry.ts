import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Approve or reject a homeowner's join request.
// Approvers = hoa_admin / hoa_staff, or an approved board member homeowner.
// On approval: creates the Property and sets the homeowner's community_id / property_id.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const isStaff = user.role === 'hoa_admin' || user.role === 'hoa_staff';
    const isBoardMember = user.role === 'homeowner' && user.board_member_status === 'approved';
    if (!isStaff && !isBoardMember) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body) return Response.json({ error: 'Invalid request body' }, { status: 400 });
    const { request_id, action, note } = body;
    if (!request_id || !['approve', 'reject'].includes(action)) {
      return Response.json({ error: 'Invalid request' }, { status: 400 });
    }

    const joinRequest = await base44.asServiceRole.entities.JoinRequest.get(request_id);
    if (!joinRequest) return Response.json({ error: 'Request not found' }, { status: 404 });

    if (joinRequest.community_id !== user.community_id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (joinRequest.status !== 'pending') {
      return Response.json({ error: 'Request already processed' }, { status: 400 });
    }

    if (action === 'approve') {
      const property = await base44.asServiceRole.entities.Property.create({
        community_id: joinRequest.community_id,
        address: joinRequest.address,
        owner_id: joinRequest.homeowner_id,
      });
      await base44.asServiceRole.entities.User.update(joinRequest.homeowner_id, {
        community_id: joinRequest.community_id,
        property_id: property.id,
      });
      await base44.asServiceRole.entities.Notification.create({
        community_id: joinRequest.community_id,
        user_id: joinRequest.homeowner_id,
        type: 'announcement',
        title: 'Your membership was approved',
        body: `Welcome to ${joinRequest.community_name || 'the community'}! You now have full access.`,
      });
    } else {
      await base44.asServiceRole.entities.Notification.create({
        community_id: joinRequest.community_id,
        user_id: joinRequest.homeowner_id,
        type: 'announcement',
        title: 'Your join request was declined',
        body: note || 'Your request to join the community was not approved. Please contact the HOA for details.',
      });
    }

    const updated = await base44.asServiceRole.entities.JoinRequest.update(request_id, {
      status: action === 'approve' ? 'approved' : 'rejected',
      reviewed_by_id: user.id,
      reviewed_by_name: user.full_name,
      review_note: note || '',
    });

    return Response.json({ request: updated });
  } catch (error) {
    console.error('process-join-request error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});