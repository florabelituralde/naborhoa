import { createClientFromRequest } from '../_shared/base44-compat.ts';
import { withCors } from '../_shared/cors.ts';

// Promotes the winners of a closed election to the board:
//   - For each position, the candidate with the most votes becomes a board member.
//   - New BoardMember records are created with campaign + homeowner contact info.
//   - Winning homeowners are granted Board Hub access (board_member_status = approved).
//   - Existing board members are marked "outgoing" and removed automatically one
//     week later (by the finalize-election-transition automation).
//   - The election is marked as promoted so this can't run twice.
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
    const { election_id } = body;
    if (!election_id) return Response.json({ error: 'election_id required' }, { status: 400 });

    const election = await base44.asServiceRole.entities.Election.get(election_id);
    if (!election) return Response.json({ error: 'Election not found' }, { status: 404 });
    if (election.community_id !== communityId) {
      return Response.json({ error: 'Not your community' }, { status: 403 });
    }
    if (election.status !== 'closed') {
      return Response.json({ error: 'Close the election before promoting winners' }, { status: 400 });
    }
    if (election.promoted) {
      return Response.json({ error: 'Winners have already been promoted' }, { status: 400 });
    }

    const candidates = election.candidates || [];
    if (candidates.length === 0) return Response.json({ error: 'No candidates' }, { status: 400 });

    const votes = await base44.asServiceRole.entities.ElectionVote.filter({ election_id });

    // Winner per position = candidate with the most votes (ties -> first).
    const positions = [...new Set(candidates.map(c => c.position).filter(Boolean))];
    const winners = [];
    for (const pos of positions) {
      let best = null;
      candidates.forEach((c, i) => {
        if (c.position !== pos) return;
        const count = votes.filter(v => v.candidate_index === i).length;
        if (!best || count > best.count) best = { candidate: c, count };
      });
      if (best) winners.push(best);
    }

    // Resolve homeowner contact info for winners linked to a homeowner.
    const homeownerIds = [...new Set(winners.map(w => w.candidate.homeowner_id).filter(Boolean))];
    const homeowners = {};
    for (const hid of homeownerIds) {
      try {
        const list = await base44.asServiceRole.entities.User.filter({ id: hid });
        if (list[0]) homeowners[hid] = list[0];
      } catch (e) {
        console.error('promote: load homeowner error', hid, e.message);
      }
    }

    // Mark current board members as outgoing — removed automatically after one week.
    const removalDate = new Date();
    removalDate.setDate(removalDate.getDate() + 7);
    const removalStr = removalDate.toISOString().slice(0, 10);
    const currentMembers = await base44.asServiceRole.entities.BoardMember.filter({ community_id: communityId });
    if (currentMembers.length > 0) {
      await base44.asServiceRole.entities.BoardMember.bulkUpdate(
        currentMembers.map(m => ({ id: m.id, outgoing: true, removal_date: removalStr }))
      );
    }

    // Create new board members from the winners and grant access.
    const promoted = [];
    for (const w of winners) {
      const c = w.candidate;
      const h = c.homeowner_id ? homeowners[c.homeowner_id] : null;
      await base44.asServiceRole.entities.BoardMember.create({
        community_id: communityId,
        name: c.name || h?.full_name || '',
        role: c.position,
        bio: c.statement || c.bio || '',
        email: h?.email || '',
        phone: h?.phone || '',
        photo_url: c.photo_url || '',
        term_start: election.start_date || '',
        term_end: election.end_date || '',
        user_id: c.homeowner_id || '',
        outgoing: false,
      });
      promoted.push({ name: c.name || h?.full_name || 'Candidate', role: c.position });

      if (c.homeowner_id && h) {
        await base44.asServiceRole.entities.User.update(h.id, { board_member_status: 'approved' });
        await base44.asServiceRole.entities.Notification.create({
          community_id: communityId,
          user_id: h.id,
          type: 'announcement',
          title: `Elected as ${c.position}`,
          body: `Congratulations! You've been elected as ${c.position} for ${election.title}. Board Hub access has been granted.`,
          related_id: election.id,
        });
      }
    }

    await base44.asServiceRole.entities.Election.update(election.id, {
      promoted: true,
      promoted_date: new Date().toISOString().slice(0, 10),
    });

    return Response.json({ ok: true, promoted: promoted.length, winners: promoted });
  } catch (error) {
    console.error('promote-election-winners error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}));