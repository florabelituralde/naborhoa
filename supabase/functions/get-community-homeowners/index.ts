import { createClientFromRequest } from '../_shared/base44-compat.ts';
import { withCors } from '../_shared/cors.ts';

Deno.serve(withCors(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (user.role !== 'hoa_admin' && user.role !== 'hoa_staff') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const communityId = user.community_id;
    if (!communityId) return Response.json({ error: 'No community' }, { status: 400 });

    const [allUsers, properties] = await Promise.all([
      base44.asServiceRole.entities.User.filter({ community_id: communityId }),
      base44.asServiceRole.entities.Property.filter({ community_id: communityId }),
    ]);

    const homeowners = allUsers
      .filter((h) => h.role === 'homeowner')
      .map((h) => ({
        id: h.id,
        full_name: h.full_name,
        email: h.email,
        property_id: h.property_id,
        created_date: h.created_date,
      }));

    const staff = allUsers
      .filter((s) => s.role === 'hoa_staff' || s.role === 'hoa_admin')
      .map((s) => ({
        id: s.id,
        full_name: s.full_name,
        email: s.email,
        role: s.role,
      }));

    const props = properties.map((p) => ({
      id: p.id,
      address: p.address,
      owner_id: p.owner_id,
    }));

    return Response.json({
      count: homeowners.length,
      members: homeowners,
      homeowners,
      staff,
      properties: props,
    });
  } catch (error) {
    console.error('get-community-homeowners error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}));