import { createClientFromRequest } from '../_shared/base44-compat.ts';
import { withCors } from '../_shared/cors.ts';

// A homeowner submits a move-out / selling form.
// Records the request, notifies HOA admins/staff, then removes the homeowner's
// membership from the community (deletes their Property and clears community_id/property_id).
Deno.serve(withCors(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (user.role !== 'homeowner' || !user.community_id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body) return Response.json({ error: 'Invalid request body' }, { status: 400 });
    const { move_out_date, reason, buyer_name, forwarding_email, forwarding_address, forwarding_phone, utility_info, keys_status, notes } = body;
    if (!move_out_date) {
      return Response.json({ error: 'Move-out date is required' }, { status: 400 });
    }

    const communityId = user.community_id;
    let community = null;
    try {
      community = await base44.asServiceRole.entities.Community.get(communityId);
    } catch {
      // community lookup best-effort
    }

    let propertyAddress = '';
    if (user.property_id) {
      try {
        const property = await base44.asServiceRole.entities.Property.get(user.property_id);
        propertyAddress = property?.address || '';
      } catch {
        // property lookup best-effort
      }
    }

    // Record the move-out request
    await base44.asServiceRole.entities.MoveOutRequest.create({
      community_id: communityId,
      community_name: community?.name || '',
      homeowner_id: user.id,
      homeowner_name: user.full_name,
      homeowner_email: user.email,
      property_address: propertyAddress,
      move_out_date,
      reason: reason || 'selling',
      buyer_name: buyer_name || '',
      forwarding_email: forwarding_email || '',
      forwarding_address: forwarding_address || '',
      forwarding_phone: forwarding_phone || '',
      utility_info: utility_info || '',
      keys_status: keys_status || 'pending',
      notes: notes || '',
    });

    // Notify HOA admins & staff
    const staff = await base44.asServiceRole.entities.User.filter({ community_id: communityId });
    const approvers = staff.filter((u) => u.role === 'hoa_admin' || u.role === 'hoa_staff');
    for (const approver of approvers) {
      await base44.asServiceRole.entities.Notification.create({
        community_id: communityId,
        user_id: approver.id,
        type: 'announcement',
        title: 'Homeowner is moving out',
        body: `${user.full_name} (${propertyAddress || 'address on file'}) submitted a move-out form. Move-out date: ${move_out_date}.`,
      });
    }

    // Remove membership: delete the property, then clear the user's community/property.
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
    console.error('process-move-out error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}));