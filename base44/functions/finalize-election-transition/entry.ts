import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Runs daily. Removes board members flagged "outgoing" once their removal date
// has passed, and revokes Board Hub access from users who no longer hold an
// active board seat. This finalizes the election transition one week after an
// admin promotes the winners.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const today = new Date().toISOString().slice(0, 10);

    const outgoing = await base44.asServiceRole.entities.BoardMember.filter({ outgoing: true });
    const toRemove = outgoing.filter(m => m.removal_date && m.removal_date <= today);

    let removed = 0;
    let revoked = 0;
    for (const m of toRemove) {
      await base44.asServiceRole.entities.BoardMember.delete(m.id);
      removed++;

      if (m.user_id) {
        const active = await base44.asServiceRole.entities.BoardMember.filter({ user_id: m.user_id, outgoing: false });
        if (active.length === 0) {
          try {
            const ulist = await base44.asServiceRole.entities.User.filter({ id: m.user_id });
            if (ulist[0] && ulist[0].board_member_status === 'approved') {
              await base44.asServiceRole.entities.User.update(m.user_id, { board_member_status: 'none' });
              revoked++;
            }
          } catch (e) {
            console.error('finalize: revoke access error', m.user_id, e.message);
          }
        }
      }
    }

    return Response.json({ ok: true, removed, revoked, scanned: outgoing.length });
  } catch (error) {
    console.error('finalize-election-transition error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});