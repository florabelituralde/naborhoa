import React from "react";
import { Link } from "react-router-dom";
import { Megaphone, Pin, ArrowRight } from "lucide-react";
import { formatDate } from "@/lib/format";

// Compact announcements widget for the resident dashboard.
export default function AnnouncementsWidget({ announcements = [] }) {
  const sorted = [...announcements].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  return (
    <div className="bg-card rounded-2xl warm-shadow p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-primary" /> Announcements
        </h2>
        <Link to="/home/announcements" className="text-sm text-primary font-medium hover:underline flex items-center gap-1">
          View all <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {sorted.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
          <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
            <Megaphone className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No announcements yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.slice(0, 4).map(ann => (
            <Link
              key={ann.id}
              to="/home/announcements"
              className="block p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="flex items-start gap-2">
                {ann.pinned && <Pin className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0 fill-primary" />}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{ann.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{ann.body}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{formatDate(ann.created_date)}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}