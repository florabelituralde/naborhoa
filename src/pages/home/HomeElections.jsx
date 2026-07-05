import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Loader2, Trophy, Check } from "lucide-react";
import { formatDate } from "@/lib/format";

export default function HomeElections() {
  const { user, community } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [elections, setElections] = useState([]);
  const [myVotes, setMyVotes] = useState({});
  const [votes, setVotes] = useState({});
  const [voting, setVoting] = useState(null);

  const loadData = async () => {
    const els = await base44.entities.Election.filter({ community_id: community.id }, "-created_date");
    setElections(els);
    const myV = {};
    const allV = {};
    for (const el of els) {
      const vts = await base44.entities.ElectionVote.filter({ election_id: el.id });
      allV[el.id] = vts;
      const mine = vts.find(v => v.voter_id === user.id);
      if (mine) myV[el.id] = mine.candidate_index;
    }
    setMyVotes(myV);
    setVotes(allV);
    setLoading(false);
  };

  useEffect(() => { if (community && user) loadData(); }, [community, user]);

  const handleVote = async (el, candidateIndex) => {
    setVoting(`${el.id}-${candidateIndex}`);
    await base44.entities.ElectionVote.create({
      election_id: el.id,
      voter_id: user.id,
      candidate_index: candidateIndex,
    });
    setVoting(null);
    loadData();
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto">
      <PageHeader title="Elections" subtitle={`Vote in ${community?.name} board elections`} />

      {elections.length === 0 ? (
        <div className="bg-card rounded-2xl warm-shadow p-12 text-center">
          <Trophy className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No active elections</p>
        </div>
      ) : (
        <div className="space-y-5">
          {elections.map(el => {
            const elVotes = votes[el.id] || [];
            const total = elVotes.length;
            const myVote = myVotes[el.id];
            const hasVoted = myVote !== undefined;
            return (
              <div key={el.id} className="bg-card rounded-2xl warm-shadow p-5">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="font-semibold text-lg">{el.title}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${el.status === "active" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                    {el.status}
                  </span>
                  {hasVoted && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary flex items-center gap-1"><Check className="w-3 h-3" /> Voted</span>}
                </div>
                {el.description && <p className="text-sm text-muted-foreground mb-1">{el.description}</p>}
                <p className="text-xs text-muted-foreground mb-4">
                  {el.start_date ? formatDate(el.start_date) : "Now"} — {formatDate(el.end_date)}
                </p>
                <div className="space-y-3">
                  {el.candidates.map((c, i) => {
                    const count = elVotes.filter(v => v.candidate_index === i).length;
                    const isMyVote = myVote === i;
                    return (
                      <div key={i} className={`p-4 rounded-xl border ${isMyVote ? "border-primary bg-primary/5" : "border-border"}`}>
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
                          {el.status === "active" && !hasVoted && (
                            <Button size="sm" variant={isMyVote ? "default" : "outline"} onClick={() => handleVote(el, i)} disabled={voting === `${el.id}-${i}`}>
                              {voting === `${el.id}-${i}` ? <Loader2 className="w-4 h-4 animate-spin" /> : "Vote"}
                            </Button>
                          )}
                        </div>
                        {c.statement && <p className="text-sm text-muted-foreground mt-2 italic">"{c.statement}"</p>}
                        {el.status === "closed" && total > 0 && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                              <span>{count} vote{count !== 1 ? "s" : ""}</span>
                              <span>{Math.round(count / total * 100)}%</span>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${count / total * 100}%` }} />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {el.status === "active" && hasVoted && <p className="text-xs text-primary mt-3 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Your vote has been recorded.</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}