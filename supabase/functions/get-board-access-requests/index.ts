import { createClientFromRequest } from '../_shared/base44-compat.ts';
import { withCors } from '../_shared/cors.ts';

// Lists homeowners with a pending board portal access request for the caller's community.
// Approvers = hoa_admin / hoa_staff, or an approved board member homeowner.
Deno.serve(withCors(async (req) => {
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

    const members = await base44.asServiceRole.entities.User.filter({
      community_id: communityId,
      board_member_status: 'pending',
    });

    // Return only the fields the approval UI needs.
    const pendingMembers = members.map((m) => ({
      id: m.id,
      full_name: m.full_name,
      email: m.email,
      requested_board_role: m.requested_board_role,
    }));

    return Response.json({ pendingMembers });
  } catch (error) {
    console.error('get-board-access-requests error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}));