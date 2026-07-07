import React from "react";
import { Check, X, AlertCircle } from "lucide-react";

const STAGES = [
  { key: "submitted", label: "Received" },
  { key: "in_progress", label: "In Progress" },
  { key: "resolved", label: "Resolved" },
];

export default function RequestProgress({ status }) {
  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10">
        <div className="w-9 h-9 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shrink-0">
          <X className="w-5 h-5" />
        </div>
        <div>
          <p className="font-semibold text-destructive">Request Cancelled</p>
          <p className="text-sm text-muted-foreground">This request is no longer active</p>
        </div>
      </div>
    );
  }

  if (status === "approved") {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-500/10">
        <div className="w-9 h-9 rounded-full bg-green-600 text-white flex items-center justify-center shrink-0">
          <Check className="w-5 h-5" />
        </div>
        <div>
          <p className="font-semibold text-green-800 dark:text-green-200">Request Approved</p>
          <p className="text-sm text-muted-foreground">Your request has been approved by the HOA.</p>
        </div>
      </div>
    );
  }

  if (status === "info_requested") {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10">
        <div className="w-9 h-9 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div>
          <p className="font-semibold text-amber-800 dark:text-amber-200">More Information Needed</p>
          <p className="text-sm text-muted-foreground">The HOA needs more details from you — see the message below.</p>
        </div>
      </div>
    );
  }

  const currentIndex = STAGES.findIndex(s => s.key === status);
  const activeIndex = currentIndex === -1 ? 0 : currentIndex;

  return (
    <div className="flex items-center">
      {STAGES.map((stage, i) => {
        const isComplete = i < activeIndex;
        const isCurrent = i === activeIndex;
        const isDone = isComplete || isCurrent;
        return (
          <React.Fragment key={stage.key}>
            <div className="flex flex-col items-center gap-2">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                  isDone ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {isComplete ? <Check className="w-5 h-5" /> : <span className="text-sm font-semibold">{i + 1}</span>}
              </div>
              <span className={`text-xs font-medium text-center ${isDone ? "text-foreground" : "text-muted-foreground"}`}>
                {stage.label}
              </span>
            </div>
            {i < STAGES.length - 1 && (
              <div className={`flex-1 h-1 mx-2 mb-6 rounded-full transition-colors ${i < activeIndex ? "bg-primary" : "bg-muted"}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}