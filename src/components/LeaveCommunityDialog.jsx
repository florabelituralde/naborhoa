import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { LogOut, Loader2 } from "lucide-react";

// Lets a homeowner voluntarily leave ("unjoin") their community without the
// move-out/selling ceremony. Removes membership immediately.
export default function LeaveCommunityDialog() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await base44.functions.invoke("leave-community");
      window.location.href = "/join";
    } catch (err) {
      setError(err.message || "Failed to leave community. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button className="w-full flex items-center justify-center gap-2 rounded-xl border border-destructive/40 text-destructive px-4 py-2.5 text-sm font-medium hover:bg-destructive/5 transition-colors">
          <LogOut className="w-4 h-4" />
          Leave Community
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Leave this community?</AlertDialogTitle>
          <AlertDialogDescription>
            Your membership and access to this community will be removed immediately. You can request to join again later. Any unpaid invoices are still owed to the HOA. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={submit}
            disabled={submitting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogOut className="w-4 h-4 mr-2" />}
            Leave Community
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}