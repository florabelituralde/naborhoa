import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Loader2, Trophy, Check, Bell } from "lucide-react";
import { formatDate } from "@/lib/format";
import { positionLabel, orderedPositionKeys } from "@/lib/electionPositions";
import { useCommunityPositions } from "@/hooks/useCommunityPositions";

export default function HomeElections() {
  const { user, community } = useOutletContext();
  const { positions } = useCommunityPositions({ id: community?.id || user?.community_id });
  const [loading, setLoading] = useState(true);
  const [electionResults, setElectionResults] = useState([]);
  const [myVotes, setMyVotes] = useState({});
  const [voting, setVoting] = useState(null);

  const loadData = async () => {
    try {
      // Load the election list client-side so it follows the builder's
      // Test/Production toggle. The backend get-community-results call is
      // kept only for closed-election tallies (cross-voter counts need the
      // service role); in production the ids match and tallies populate, in
      // test mode the backend hits prod so test elections simply show no
      // tally bars — active voting still works either way.
      const communityId = community?.id || user?.community_id;
      const [elections, myAllVotes, res] = await Promise.all([
        base44.entities.Election.filter({ community_id: communityId }, "-created_date"),
        base44.entities.ElectionVote.filter({}),
        base44.functions.invoke("get-community-results", {}).catch(() => null),
      ]);
      const tallyMap = {};
      for (const el of res?.data?.elections || []) {
        tallyMap[el.id] = { counts: el.counts, total: el.total };
      }
      const results = elections.map(el => {
        const t = tallyMap[el.id];
        return {
          id: el.id,
          title: el.title,
          description: el.description,
          status: el.status,
          start_date: el.start_date,
          end_date: el.end_date,
          promoted: el.promoted,
          promoted_date: el.promoted_date,
          candidates: el.candidates,
          counts: t?.counts || (el.candidates || []).map(() => 0),
          total: t?.total || 0,
        };
      });
      setElectionResults(results);
      const myV = {};
      for (const v of myAllVotes) {
        myV[`${v.election_id}:${positionLabel(v.position)}`] = v.candidate_index;
      }
      setMyVotes(myV);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (community && user) loadData();
    else setLoading(false);
  }, [community, user]);

  const handleVote = async (el, position, candidateIndex) => {
    setVoting(`${el.id}:${position}:${candidateIndex}`);
    try {
      await base44.entities.ElectionVote.create({
        election_id: el.id,
        voter_id: user.id,
        candidate_index: candidateIndex,
        position,
      });
      loadData();
    } finally {
      setVoting(null);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const reminders = electionResults
    .filter(el => el.status === "active")
    .map(el => {
      const positions = [...new Set((el.candidates || []).map(c => c.position).filter(Boolean))];
      const missing = positions.filter(p => myVotes[`${el.id}:${p}`] === undefined);
      return { el, missing };
    })
    .filter(r => r.missing.length > 0);

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto">
      <PageHeader title="Elections" subtitle={`Vote in ${community?.name} board elections`} />

      {reminders.length > 0 && (
        <div className="mb-5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Reminder: outstanding votes</p>
          </div>
          <div className="space-y-1">
            {reminders.map(r => (
              <p key={r.el.id} className="text-sm text-amber-700 dark:text-amber-200">
                <span className="font-medium">{r.el.title}</span> — you still need to vote for: {r.missing.map(p => positionLabel(p)).join(", ")}. Closes {formatDate(r.el.end_date)}.
              </p>
            ))}
          </div>
        </div>
      )}

      {electionResults.length === 0 ? (
        <div className="bg-card rounded-2xl warm-shadow p-12 text-center">
          <Trophy className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No active elections</p>
        </div>
      ) : (
        <div className="space-y-5">
          {electionResults.map(el => {
            const total = el.total;
            const byPosition = {};
            (el.candidates || []).forEach((c, i) => {
              // Normalize to the display label so legacy enum values and
              // display names group together instead of duplicating sections.
              const key = positionLabel(c.position || "member_at_large");
              if (!byPosition[key]) byPosition[key] = [];
              byPosition[key].push({ ...c, _index: i, count: el.counts[i] || 0 });
            });
            const positions = Object.keys(byPosition);
            const votedPositions = positions.filter(p => myVotes[`${el.id}:${p}`] !== undefined);
            const fullyVoted = positions.length > 0 && votedPositions.length === positions.length;
            return (
              <div key={el.id} className="bg-card rounded-2xl warm-shadow p-5">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="font-semibold text-lg">{el.title}</h3>
                  <StatusBadge status={el.status} />
                  {fullyVoted && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary flex items-center gap-1"><Check className="w-3 h-3" /> All votes submitted</span>}
                </div>
                {el.description && <p className="text-sm text-muted-foreground mb-1">{el.description}</p>}
                <p className="text-xs text-muted-foreground mb-4">
                  {el.start_date ? formatDate(el.start_date) : "Now"} — {formatDate(el.end_date)}
                </p>
                <div className="space-y-4">
                  {orderedPositionKeys(byPosition, positions).map(key => {
                    const cands = byPosition[key];
                    if (!cands || cands.length === 0) return null;
                    const myPick = myVotes[`${el.id}:${key}`];
                    const positionVoted = myPick !== undefined;
                    return (
                      <div key={key}>
                        <div className="flex items-center gap-2 mb-2">
                          <p className="text-sm font-semibold">{positionLabel(key)}</p>
                          {positionVoted && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary flex items-center gap-1"><Check className="w-3 h-3" /> Voted</span>}
                        </div>
                        <div className="space-y-2">
                          {cands.map((c, idx) => {
                            const isMyVote = myPick === c._index;
                            return (
                              <div key={idx} className={`p-4 rounded-xl border ${isMyVote ? "border-primary bg-primary/5" : "border-border"}`}>
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-3 flex-1">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                                      {c.name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1">
                                      <p className="font-medium">{c.name}</p>
                                      {c.bio && <p className="text-xs text-muted-foreground mt-0.5">{c.bio}</p>}
                                    </div>
                                  </div>
                                  {el.status === "active" && !positionVoted && (
                                    <Button size="sm" variant={isMyVote ? "default" : "outline"} onClick={() => handleVote(el, key, c._index)} disabled={voting === `${el.id}:${key}:${c._index}`}>
                                      {voting === `${el.id}:${key}:${c._index}` ? <Loader2 className="w-4 h-4 animate-spin" /> : "Vote"}
                                    </Button>
                                  )}
                                </div>
                                {c.statement && <p className="text-sm text-muted-foreground mt-2 italic">"{c.statement}"</p>}
                                {el.status === "closed" && total > 0 && (
                                  <div className="mt-3">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                                      <span>{c.count} vote{c.count !== 1 ? "s" : ""}</span>
                                      <span>{Math.round(c.count / total * 100)}%</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                                      <div className="h-full bg-primary rounded-full" style={{ width: `${c.count / total * 100}%` }} />
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {el.status === "active" && !fullyVoted && votedPositions.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-3">You've voted in {votedPositions.length} of {positions.length} positions.</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}