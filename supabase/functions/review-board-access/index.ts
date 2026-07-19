import { createClientFromRequest } from '../_shared/base44-compat.ts';
import { withCors } from '../_shared/cors.ts';

const ROLE_VALUES = ['president', 'vice_president', 'treasurer', 'secretary', 'member_at_large'];

Deno.serve(withCors(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (caller.role !== 'hoa_admin' && caller.role !== 'hoa_staff') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const communityId = caller.community_id;
    if (!communityId) return Response.json({ error: 'No community' }, { status: 400 });

    const body = await req.json().catch(() => null);
    if (!body) return Response.json({ error: 'Invalid request body' }, { status: 400 });
    const { member_id, action, role } = body;
    if (!member_id || !['approve', 'reject'].includes(action)) {
      return Response.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Load the target user and confirm they belong to the caller's community.
    const target = await base44.asServiceRole.entities.User.filter({ id: member_id });
    const member = target[0];
    if (!member) return Response.json({ error: 'Member not found' }, { status: 404 });
    if (member.community_id !== communityId) {
      return Response.json({ error: 'Member not in your community' }, { status: 403 });
    }

    if (action === 'reject') {
      await base44.asServiceRole.entities.User.update(member.id, { board_member_status: 'rejected' });
      return Response.json({ status: 'rejected' });
    }

    // approve
    const chosenRole = ROLE_VALUES.includes(role) ? role : (member.requested_board_role || 'member_at_large');
    await base44.asServiceRole.entities.User.update(member.id, {
      board_member_status: 'approved',
      requested_board_role: chosenRole,
    });

    // Avoid duplicate BoardMember rows if approved twice.
    const existing = await base44.asServiceRole.entities.BoardMember.filter({
      community_id: communityId,
      email: member.email,
    });
    if (existing.length === 0) {
      await base44.asServiceRole.entities.BoardMember.create({
        community_id: communityId,
        name: member.full_name,
        role: chosenRole,
        email: member.email,
        user_id: member.id,
      });
    }

    await base44.asServiceRole.entities.Notification.create({
      community_id: communityId,
      user_id: member.id,
      type: 'announcement',
      title: 'Board portal access approved',
      body: 'You now have access to the Board Hub.',
    });

    return Response.json({ status: 'approved', role: chosenRole });
  } catch (error) {
    console.error('review-board-access error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}));