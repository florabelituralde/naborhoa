import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// A homeowner voluntarily leaves ("unjoins") their community. Unlike the
// move-out flow, this is a simple, immediate removal of membership — no
// move-out record, no ceremony. The HOA is notified so they aren't blindsided.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (user.role !== 'homeowner' || !user.community_id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const communityId = user.community_id;

    let community = null;
    try {
      community = await base44.asServiceRole.entities.Community.get(communityId);
    } catch {
      // community lookup best-effort
    }

    // Notify HOA admins & staff that a homeowner left the community.
    try {
      const staff = await base44.asServiceRole.entities.User.filter({ community_id: communityId });
      const approvers = staff.filter((u) => u.role === 'hoa_admin' || u.role === 'hoa_staff');
      for (const approver of approvers) {
        await base44.asServiceRole.entities.Notification.create({
          community_id: communityId,
          user_id: approver.id,
          type: 'announcement',
          title: 'Homeowner left the community',
          body: `${user.full_name} has left ${community?.name || 'the community'}.`,
        });
      }
    } catch (e) {
      console.error('leave-community: notify failed:', e.message);
    }

    // Remove the homeowner's property record (if any), then clear membership.
    if (user.property_id) {
      try {
        await base44.asServiceRole.entities.Property.delete(user.property_id);
      } catch {
        // already removed
      }
    }
    await base44.asServiceRole.entities.User.update(user.id, {
      community_id: null,
      property_id: null,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('leave-community error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});