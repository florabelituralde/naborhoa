import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { Loader2, Vote, Check, Bell } from "lucide-react";
import { formatDate } from "@/lib/format";
import AnnouncementAttachments from "@/components/AnnouncementAttachments";

export default function HomePolls() {
  const { user, community } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [polls, setPolls] = useState([]);
  const [myVotes, setMyVotes] = useState([]);

  const loadData = async () => {
    try {
      const [res, own] = await Promise.all([
        base44.functions.invoke("get-community-results", {}),
        base44.entities.PollVote.filter({}),
      ]);
      setPolls(res?.data?.polls || []);
      setMyVotes(own);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (community && user) loadData();
    else setLoading(false);
  }, [community, user]);

  const hasVoted = (pollId) => myVotes.some(v => v.poll_id === pollId);
  const userVote = (pollId) => myVotes.find(v => v.poll_id === pollId);

  const castVote = async (poll, optionIndex) => {
    if (hasVoted(poll.id) || poll.status === "closed") return;
    await base44.entities.PollVote.create({
      poll_id: poll.id,
      voter_id: user.id,
      option_index: optionIndex,
    });
    loadData();
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const reminders = polls.filter(p => p.status === "active" && !hasVoted(p.id));

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto">
      <PageHeader title="Polls" subtitle="Vote on community decisions" />

      {reminders.length > 0 && (
        <div className="mb-5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Reminder: you have polls to vote on</p>
          </div>
          <div className="space-y-1">
            {reminders.map(p => (
              <p key={p.id} className="text-sm text-amber-700 dark:text-amber-200">
                <span className="font-medium">{p.title}</span> — closes {formatDate(p.deadline)}.
              </p>
            ))}
          </div>
        </div>
      )}

      {polls.length === 0 ? (
        <div className="bg-card rounded-2xl warm-shadow p-12 text-center">
          <Vote className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No active polls</p>
        </div>
      ) : (
        <div className="space-y-4">
          {polls.map(poll => {
            const voted = hasVoted(poll.id);
            const myVote = userVote(poll.id);
            const totalVotes = poll.total;
            const showResults = voted || poll.status === "closed";

            return (
              <div key={poll.id} className="bg-card rounded-2xl warm-shadow p-6">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-lg">{poll.title}</h3>
                  <StatusBadge status={poll.status} />
                </div>
                {poll.description && <p className="text-sm text-muted-foreground mb-2">{poll.description}</p>}
                <p className="text-xs text-muted-foreground mb-4">Deadline: {formatDate(poll.deadline)}</p>

                <div className="space-y-2">
                  {poll.options.map((opt, i) => {
                    const count = poll.counts[i] || 0;
                    const pct = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
                    const isMyVote = myVote?.option_index === i;

                    if (showResults) {
                      return (
                        <div key={i} className={`p-3 rounded-lg border-2 ${isMyVote ? "border-primary bg-primary/5" : "border-border"}`}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="flex items-center gap-2 font-medium">
                              {isMyVote && <Check className="w-4 h-4 text-primary" />}
                              {opt}
                            </span>
                            <span className="text-muted-foreground">{count} ({pct.toFixed(0)}%)</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    }

                    return (
                      <button
                        key={i}
                        onClick={() => castVote(poll, i)}
                        className="w-full text-left p-3 rounded-lg border-2 border-border hover:border-primary hover:bg-primary/5 transition-all"
                      >
                        <span className="text-sm font-medium">{opt}</span>
                      </button>
                    );
                  })}
                </div>
                <AnnouncementAttachments attachments={poll.attachments} />
                {voted && <p className="text-xs text-primary mt-3 flex items-center gap-1"><Check className="w-3 h-3" /> You voted</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}