import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Returns aggregated poll + election results for the caller's community.
// Uses the service role so vote counts are real (PollVote/ElectionVote reads
// are otherwise restricted to a user's own records).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const communityId = caller.community_id;
    if (!communityId) return Response.json({ error: 'No community' }, { status: 400 });

    const [polls, elections, pollVotes, electionVotes] = await Promise.all([
      base44.asServiceRole.entities.Poll.filter({ community_id: communityId }, '-created_date'),
      base44.asServiceRole.entities.Election.filter({ community_id: communityId }, '-created_date'),
      base44.asServiceRole.entities.PollVote.filter({}),
      base44.asServiceRole.entities.ElectionVote.filter({}),
    ]);

    const pollResults = polls.map(p => {
      const votes = pollVotes.filter(v => v.poll_id === p.id);
      const counts = (p.options || []).map((_, i) => votes.filter(v => v.option_index === i).length);
      return {
        id: p.id,
        title: p.title,
        description: p.description,
        status: p.status,
        deadline: p.deadline,
        options: p.options,
        attachments: p.attachments,
        counts,
        total: votes.length,
      };
    });

    const electionResults = elections.map(el => {
      const votes = electionVotes.filter(v => v.election_id === el.id);
      const counts = (el.candidates || []).map((_, i) => votes.filter(v => v.candidate_index === i).length);
      return {
        id: el.id,
        title: el.title,
        description: el.description,
        status: el.status,
        start_date: el.start_date,
        end_date: el.end_date,
        candidates: el.candidates,
        counts,
        total: votes.length,
      };
    });

    return Response.json({ polls: pollResults, elections: electionResults });
  } catch (error) {
    console.error('get-community-results error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});