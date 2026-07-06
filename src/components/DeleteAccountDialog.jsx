import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

// Apple App Store guideline 5.1.1(v) requires apps that support account
// creation to offer account deletion from within the app. This dialog flags
// the account for deletion (the platform processes the purge server-side)
// and signs the user out.
export default function DeleteAccountDialog({ user }) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);

  const email = user?.email || "";
  const matches = confirmText.trim().toLowerCase() === email.toLowerCase();

  const handleDelete = async () => {
    if (!matches) return;
    setLoading(true);
    try {
      // Record the deletion request on the user profile so it can be processed
      // server-side (data purge within 30 days, GDPR-aligned).
      await base44.auth.updateMe({
        account_deletion_requested: true,
        account_deletion_requested_at: new Date().toISOString(),
      });
      toast({
        title: "Account deletion scheduled",
        description: "Your account and data will be permanently removed within 30 days.",
      });
      // Sign the user out and return to login.
      base44.auth.logout("/login");
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Could not complete request",
        description: err?.message || "Please try again or contact support.",
      });
      setLoading(false);
    }
  };

  return (
    <>
      <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-6">
        <h2 className="font-semibold text-lg flex items-center gap-2 text-destructive">
          <AlertTriangle className="w-5 h-5" /> Delete Account
        </h2>
        <p className="text-sm text-muted-foreground mt-2 mb-4">
          Permanently delete your account and all associated data. This action cannot be undone.
          Your requests, invoices, and community membership will be removed.
        </p>
        <Button variant="destructive" onClick={() => setOpen(true)} className="w-full sm:w-auto">
          <Trash2 className="w-4 h-4 mr-2" /> Delete my account
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setConfirmText(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" /> Confirm permanent deletion
            </DialogTitle>
            <DialogDescription>
              This will permanently delete your Nabor account and all your data within 30 days.
              This action <strong>cannot</strong> be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="delete-confirm">
              Type your email <span className="font-medium text-foreground">{email}</span> to confirm
            </Label>
            <Input
              id="delete-confirm"
              type="email"
              autoComplete="off"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={email}
              disabled={loading}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={!matches || loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}