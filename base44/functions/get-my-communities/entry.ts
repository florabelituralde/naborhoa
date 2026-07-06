import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Returns all communities owned by the current HOA admin (grouped by their organization),
// so the portal can offer a community switcher. Uses the service role to avoid RLS gaps.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (user.role !== 'hoa_admin' && user.role !== 'hoa_staff') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!user.organization_id) {
      return Response.json({ communities: [] });
    }

    const communities = await base44.asServiceRole.entities.Community.filter({
      organization_id: user.organization_id,
    });

    const result = communities.map((c) => ({
      id: c.id,
      name: c.name,
      city: c.city,
      state: c.state,
    }));

    return Response.json({ communities: result });
  } catch (error) {
    console.error('get-my-communities error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});