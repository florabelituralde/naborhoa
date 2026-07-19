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

// Scheduled daily. Reminds homeowners who haven't voted in an active poll
// whose deadline hasn't passed. Dedupes so a given (user, poll) reminds at
// most once per calendar day. Stops reminding once the user votes.
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

    const polls = await base44.asServiceRole.entities.Poll.filter({ status: 'active' });
    let created = 0;

    for (const poll of polls) {
      if (!poll.community_id || !poll.deadline) continue;
      if (poll.deadline < todayStr) continue;

      // Automated reminders are a Connected+ feature — skip communities whose
      // plan doesn't include automations (and whose trial has ended).
      const community = await getCommunity(poll.community_id);
      if (!automationsEnabled(community)) continue;

      const [homeowners, votes] = await Promise.all([
        base44.asServiceRole.entities.User.filter({ community_id: poll.community_id, role: 'homeowner' }),
        base44.asServiceRole.entities.PollVote.filter({ poll_id: poll.id }),
      ]);
      const voted = new Set(votes.map(v => v.voter_id));

      for (const h of homeowners) {
        if (voted.has(h.id)) continue;

        // dedupe: skip if already reminded about this poll today
        const existing = await base44.asServiceRole.entities.Notification.filter({
          user_id: h.id,
          related_id: poll.id,
          type: 'poll_deadline',
        }, '-created_date', 1);
        if (existing.length > 0 && new Date(existing[0].created_date) >= new Date(startOfDay)) {
          continue;
        }

        await base44.asServiceRole.entities.Notification.create({
          community_id: poll.community_id,
          user_id: h.id,
          type: 'poll_deadline',
          title: `Reminder: Vote in ${poll.title}`,
          body: `You haven't voted yet. Voting closes ${poll.deadline}.`,
          related_id: poll.id,
        });
        created++;
      }
    }

    return Response.json({ ok: true, reminders_created: created, polls_scanned: polls.length });
  } catch (error) {
    console.error('send-poll-reminders error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}));