import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (user.role !== 'hoa_admin' && user.role !== 'hoa_staff') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const communityId = user.community_id;
    if (!communityId) return Response.json({ error: 'No community' }, { status: 400 });

    const homeowners = await base44.asServiceRole.entities.User.filter({
      community_id: communityId,
      role: 'homeowner',
    });

    return Response.json({ count: homeowners.length });
  } catch (error) {
    console.error('get-community-homeowners error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});