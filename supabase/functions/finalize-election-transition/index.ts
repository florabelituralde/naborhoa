import { createClientFromRequest } from '../_shared/base44-compat.ts';
import { withCors } from '../_shared/cors.ts';

// Runs daily. One week after an admin promoted an election's winners, this
// revokes Board Hub access from outgoing board members who no longer hold an
// active seat. It does NOT delete board member records or remove anyone from
// the community — only board hub access is removed.
Deno.serve(withCors(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const today = new Date().toISOString().slice(0, 10);

    const outgoing = await base44.asServiceRole.entities.BoardMember.filter({ outgoing: true });
    const due = outgoing.filter(m => m.removal_date && m.removal_date <= today);

    let revoked = 0;
    for (const m of due) {
      if (!m.user_id) continue;
      // Skip anyone who still holds an active seat (e.g. re-elected).
      const active = await base44.asServiceRole.entities.BoardMember.filter({ user_id: m.user_id, outgoing: false });
      if (active.length > 0) continue;
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

    return Response.json({ ok: true, revoked, scanned: due.length });
  } catch (error) {
    console.error('finalize-election-transition error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}));