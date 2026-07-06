import React from "react";
import { Link } from "react-router-dom";
import StatusBadge from "@/components/StatusBadge";
import { Vote } from "lucide-react";
import { formatDate } from "@/lib/format";

export default function BoardPollResultsSection({ polls, votes, managePath = "/hoa/polls" }) {
  const getVoteCount = (pollId, optionIndex) =>
    votes.filter(v => v.poll_id === pollId && v.option_index === optionIndex).length;

  return (
    <div className="bg-card rounded-2xl warm-shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <Vote className="w-5 h-5 text-primary" /> Poll Results
        </h2>
        <Link to={managePath} className="text-sm text-primary font-medium hover:underline">View polls</Link>
      </div>
      {polls.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No polls yet</p>
      ) : (
        <div className="space-y-5">
          {polls.slice(0, 3).map(poll => {
            const totalVotes = poll.options.reduce((sum, _, i) => sum + getVoteCount(poll.id, i), 0);
            return (
              <div key={poll.id}>
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-sm">{poll.title}</p>
                  <StatusBadge status={poll.status} />
                </div>
                <p className="text-xs text-muted-foreground mb-2">Deadline: {formatDate(poll.deadline)} · {totalVotes} votes</p>
                <div className="space-y-1.5">
                  {poll.options.map((opt, i) => {
                    const count = getVoteCount(poll.id, i);
                    const pct = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-xs mb-0.5">
                          <span>{opt}</span>
                          <span className="text-muted-foreground">{count} ({pct.toFixed(0)}%)</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}