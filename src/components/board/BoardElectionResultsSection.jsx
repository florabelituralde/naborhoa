import React from "react";
import { Link } from "react-router-dom";
import StatusBadge from "@/components/StatusBadge";
import { Trophy } from "lucide-react";
import { formatDate } from "@/lib/format";
import { positionLabel } from "@/lib/electionPositions";

export default function BoardElectionResultsSection({ electionResults, viewPath = "/home/elections" }) {
  return (
    <div className="bg-card rounded-2xl warm-shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" /> Election Results
        </h2>
        <Link to={viewPath} className="text-sm text-primary font-medium hover:underline">View elections</Link>
      </div>
      {electionResults.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No elections yet</p>
      ) : (
        <div className="space-y-5">
          {electionResults.slice(0, 2).map(el => {
            const total = el.total;
            const byPosition = {};
            (el.candidates || []).forEach((c, i) => {
              const key = c.position || "board_member";
              if (!byPosition[key]) byPosition[key] = [];
              byPosition[key].push({ ...c, count: el.counts[i] || 0 });
            });
            return (
              <div key={el.id}>
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-sm">{el.title}</p>
                  <StatusBadge status={el.status} />
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  {el.start_date ? formatDate(el.start_date) : "Now"} — {formatDate(el.end_date)} · {total} votes
                </p>
                <div className="space-y-3">
                  {Object.keys(byPosition).map(key => {
                    const cands = byPosition[key];
                    if (!cands || cands.length === 0) return null;
                    return (
                      <div key={key}>
                        <p className="text-xs font-medium text-muted-foreground mb-1">{positionLabel(key)}</p>
                        <div className="space-y-1.5">
                          {cands.map((c, idx) => {
                            const pct = total > 0 ? (c.count / total) * 100 : 0;
                            return (
                              <div key={idx}>
                                <div className="flex justify-between text-xs mb-0.5">
                                  <span>{c.name}</span>
                                  <span className="text-muted-foreground">{c.count} ({pct.toFixed(0)}%)</span>
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}