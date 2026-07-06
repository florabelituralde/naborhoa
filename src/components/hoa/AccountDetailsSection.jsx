import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Mail, KeyRound, Loader2, Check } from "lucide-react";

export default function AccountDetailsSection({ user }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handlePasswordReset = async () => {
    setSending(true);
    try {
      await base44.auth.resetPasswordRequest(user.email);
      setSent(true);
    } catch {
      // Always show generic success — the API hides whether the email exists.
      setSent(true);
    }
    setSending(false);
  };

  return (
    <div className="bg-card rounded-2xl warm-shadow p-6">
      <h2 className="font-semibold text-lg mb-4">Account Details</h2>
      <div className="space-y-4">
        <div>
          <Label>Full Name</Label>
          <Input value={user?.full_name || ""} disabled className="mt-1.5" />
        </div>
        <div>
          <Label className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email Address</Label>
          <Input value={user?.email || ""} disabled className="mt-1.5" />
          <p className="text-xs text-muted-foreground mt-1.5">
            Your email is managed by your login and can't be changed here. Contact support to update it.
          </p>
        </div>
        <div className="pt-2 border-t border-border">
          <Label className="flex items-center gap-1.5"><KeyRound className="w-3.5 h-3.5" /> Password</Label>
          {sent ? (
            <p className="text-sm text-primary mt-1.5 flex items-center gap-1.5">
              <Check className="w-4 h-4" /> Password reset link sent to {user?.email}. Check your inbox.
            </p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mt-1.5 mb-3">
                We'll email you a secure link to set a new password.
              </p>
              <Button variant="outline" onClick={handlePasswordReset} disabled={sending}>
                {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <KeyRound className="w-4 h-4 mr-2" />}
                Change password
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}