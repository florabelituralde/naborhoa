import React from "react";
import { CheckCircle2, Play, UserCheck, UserX, FileText, Send, XCircle, Circle } from "lucide-react";
import { formatDateTime } from "@/lib/format";

const ICONS = {
  created: { icon: Send, color: "bg-primary/10 text-primary" },
  in_progress: { icon: Play, color: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" },
  resolved: { icon: CheckCircle2, color: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300" },
  cancelled: { icon: XCircle, color: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300" },
  assigned: { icon: UserCheck, color: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300" },
  unassigned: { icon: UserX, color: "bg-muted text-muted-foreground" },
  note: { icon: FileText, color: "bg-accent text-accent-foreground" },
};

// Resolve which icon/color to use for an entry (status_change keys off its status).
function styleFor(entry) {
  if (entry.type === "status_change") return ICONS[entry.status] || { icon: Circle, color: "bg-muted text-muted-foreground" };
  return ICONS[entry.type] || { icon: Circle, color: "bg-muted text-muted-foreground" };
}

// Read-only activity timeline for a request. Falls back to the creation date
// when a request predates activity logging.
export default function RequestTimeline({ request }) {
  const log = Array.isArray(request.activity_log) ? [...request.activity_log] : [];

  // Ensure a "Submitted" entry always leads the timeline.
  const hasCreated = log.some((e) => e.type === "created");
  const entries = hasCreated
    ? log
    : [{ type: "created", label: "Request submitted", timestamp: request.created_date }, ...log];

  entries.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  return (
    <div className="bg-card rounded-2xl warm-shadow p-6">
      <h2 className="font-semibold text-lg mb-5">Activity Timeline</h2>
      <div className="relative">
        {entries.map((entry, i) => {
          const { icon: Icon, color } = styleFor(entry);
          const isLast = i === entries.length - 1;
          return (
            <div key={i} className="flex gap-4 pb-6 last:pb-0 relative">
              {!isLast && <span className="absolute left-[15px] top-8 bottom-0 w-px bg-border" />}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="pt-1 min-w-0">
                <p className="text-sm font-medium">{entry.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{formatDateTime(entry.timestamp)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}