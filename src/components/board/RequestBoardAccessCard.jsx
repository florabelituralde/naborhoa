import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, Clock, ShieldQuestion } from "lucide-react";

// Lets an already-registered homeowner request board portal access and see the review status.
export default function RequestBoardAccessCard({ user }) {
  const [status, setStatus] = useState(user?.board_member_status || "none");
  const [submitting, setSubmitting] = useState(false);

  // The user object from context can be stale (e.g. after an admin approves the
  // request). Re-fetch the live status so an approved request stops showing "pending".
  useEffect(() => {
    base44.auth.me()
      .then(u => setStatus(u.board_member_status || "none"))
      .catch(() => {});
  }, []);

  const requestAccess = async () => {
    setSubmitting(true);
    await base44.auth.updateMe({ board_member_status: "pending" });
    setStatus("pending");
    setSubmitting(false);
  };

  if (status === "approved") {
    return (
      <Link to="/home/board-hub" className="bg-primary/5 border border-primary/20 rounded-2xl p-6 flex items-center gap-4 hover:bg-primary/10 transition-colors">
        <div className="shrink-0 w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="font-semibold">Board portal access</p>
          <p className="text-sm text-muted-foreground">You're approved — open the Board Hub.</p>
        </div>
      </Link>
    );
  }

  if (status === "pending") {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex items-center gap-4">
        <div className="shrink-0 w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center">
          <Clock className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <p className="font-semibold">Board access request pending</p>
          <p className="text-sm text-muted-foreground">Your HOA manager is reviewing your request.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl warm-shadow p-6 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex items-center gap-4 flex-1">
        <div className="shrink-0 w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
          <ShieldQuestion className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="font-semibold">Are you a board member?</p>
          <p className="text-sm text-muted-foreground">
            {status === "rejected"
              ? "Your previous request wasn't approved. You can submit a new one."
              : "Request access to the board portal. Your HOA manager will review and approve it."}
          </p>
        </div>
      </div>
      <Button onClick={requestAccess} disabled={submitting} className="shrink-0">
        {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Request Board Access
      </Button>
    </div>
  );
}