import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Lets a newly-signed-up user choose their role (homeowner or hoa_admin) and
// stage the related profile fields captured during registration. The platform
// blocks self-service role writes via auth.updateMe ("Only platform users can
// update user roles"), so this persists them as the service role for the
// calling user only.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { role, pending_org_name, board_member_status } = body;

    if (role !== 'homeowner' && role !== 'hoa_admin') {
      return Response.json({ error: 'Invalid role' }, { status: 400 });
    }

    const update = { role };
    if (role === 'hoa_admin' && typeof pending_org_name === 'string' && pending_org_name.trim()) {
      update.pending_org_name = pending_org_name.trim();
    }
    if (role === 'homeowner' && board_member_status === 'pending') {
      update.board_member_status = 'pending';
    }

    const updated = await base44.asServiceRole.entities.User.update(user.id, update);
    return Response.json({ user: updated });
  } catch (error) {
    console.error('set-user-role error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});