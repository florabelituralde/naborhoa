import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Lists join requests for the approver's community.
// Approvers = hoa_admin / hoa_staff, or an approved board member homeowner.
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

    const communityId = user.community_id;
    if (!communityId) return Response.json({ error: 'No community' }, { status: 400 });

    const requests = await base44.asServiceRole.entities.JoinRequest.filter(
      { community_id: communityId },
      '-created_date',
      500,
    );

    return Response.json({ requests });
  } catch (error) {
    console.error('get-join-requests error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});