import { createClientFromRequest } from '../_shared/base44-compat.ts';
import { withCors } from '../_shared/cors.ts';

// Plans that include automations (automated reminders). Trial communities also
// get full access. Mirror of the frontend gating in src/lib/planAccess.js.
const TRIAL_DAYS = 14;
const AUTOMATION_PLANS = new Set(["pro", "pro_multi"]);
function automationsEnabled(c: any): boolean {
  if (!c) return false;
  if (c.plan_id) return AUTOMATION_PLANS.has(c.plan_id);
  if (c.subscription_status === "ended") return false;
  const created = c.created_date ? new Date(c.created_date) : null;
  if (!created || isNaN(created.getTime())) return false;
  return Date.now() < created.getTime() + TRIAL_DAYS * 86400000;
}

// Scheduled daily. Reminds homeowners who haven't voted in every position of
// an active election. Dedupes so a given (user, election) reminds at most
// once per calendar day. Stops reminding once all positions are voted.
Deno.serve(withCors(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const communityCache = new Map<string, any>();
    const getCommunity = async (id: string) => {
      if (!id) return null;
      if (communityCache.has(id)) return communityCache.get(id);
      let c: any = null;
      try { c = await base44.asServiceRole.entities.Community.get(id); } catch (_) {}
      communityCache.set(id, c);
      return c;
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfDay = new Date(today).toISOString();
    const todayStr = today.toISOString().slice(0, 10);

    const elections = await base44.asServiceRole.entities.Election.filter({ status: 'active' });
    let created = 0;

    for (const el of elections) {
      if (!el.community_id || !el.end_date) continue;
      if (el.end_date < todayStr) continue; // already ended

      const positions = [...new Set((el.candidates || []).map(c => c.position).filter(Boolean))];
      if (positions.length === 0) continue;

      // Automated reminders are a Connected+ feature — skip communities whose
      // plan doesn't include automations (and whose trial has ended).
      const community = await getCommunity(el.community_id);
      if (!automationsEnabled(community)) continue;

      const [homeowners, votes] = await Promise.all([
        base44.asServiceRole.entities.User.filter({ community_id: el.community_id, role: 'homeowner' }),
        base44.asServiceRole.entities.ElectionVote.filter({ election_id: el.id }),
      ]);

      for (const h of homeowners) {
        const votedPositions = new Set(votes.filter(v => v.voter_id === h.id).map(v => v.position));
        const missing = positions.filter(p => !votedPositions.has(p));
        if (missing.length === 0) continue;

        // dedupe: skip if already reminded about this election today
        const existing = await base44.asServiceRole.entities.Notification.filter({
          user_id: h.id,
          related_id: el.id,
          type: 'election',
        }, '-created_date', 1);
        if (existing.length > 0 && new Date(existing[0].created_date) >= new Date(startOfDay)) {
          continue;
        }

        const missingLabel = missing.map(p => p.replace(/_/g, ' ')).join(', ');
        await base44.asServiceRole.entities.Notification.create({
          community_id: el.community_id,
          user_id: h.id,
          type: 'election',
          title: `Reminder: Vote in ${el.title}`,
          body: missing.length === positions.length
            ? `You haven't voted yet. Voting closes ${el.end_date}.`
            : `You still need to vote for: ${missingLabel}. Voting closes ${el.end_date}.`,
          related_id: el.id,
        });
        created++;
      }
    }

    return Response.json({ ok: true, reminders_created: created, elections_scanned: elections.length });
  } catch (error) {
    console.error('send-election-reminders error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}));