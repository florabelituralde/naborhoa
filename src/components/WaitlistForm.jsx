import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, Bell } from "lucide-react";

// Lets a homeowner leave their email + address when their community isn't on
// Nabor yet, so they can be notified when their HOA joins the platform.
export default function WaitlistForm({ initialAddress = "", initialEmail = "", title }) {
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState(initialAddress);
  const [communityName, setCommunityName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialEmail) setEmail(initialEmail);
  }, [initialEmail]);

  const submit = async (e) => {
    e?.preventDefault();
    if (!email.trim() || !address.trim() || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await base44.entities.Waitlist.create({
        email: email.trim(),
        address: address.trim(),
        community_name: communityName.trim() || undefined,
        status: "pending",
      });
      setDone(true);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    }
    setSubmitting(false);
  };

  if (done) {
    return (
      <div className="flex flex-col items-center text-center py-2">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
          <CheckCircle2 className="w-5 h-5 text-primary" />
        </div>
        <p className="text-sm font-medium">You're on the list!</p>
        <p className="text-xs text-muted-foreground mt-1">
          We'll email you at {email} when your HOA joins Nabor.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {title && (
        <div className="flex items-center gap-2 text-sm font-medium">
          <Bell className="w-4 h-4 text-primary" />
          {title}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Don't see your community? Leave your email and we'll notify you when your HOA joins Nabor.
      </p>
      <div>
        <Label htmlFor="wl-email" className="text-xs">Email</Label>
        <Input
          id="wl-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="mt-1 h-10"
          required
        />
      </div>
      <div>
        <Label htmlFor="wl-addr" className="text-xs">Property Address</Label>
        <Input
          id="wl-addr"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="123 Main St"
          className="mt-1 h-10"
          required
        />
      </div>
      <div>
        <Label htmlFor="wl-community" className="text-xs">HOA / Community Name (optional)</Label>
        <Input
          id="wl-community"
          value={communityName}
          onChange={(e) => setCommunityName(e.target.value)}
          placeholder="e.g. Oakwood Hills HOA"
          className="mt-1 h-10"
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button type="submit" disabled={submitting || !email.trim() || !address.trim()} className="w-full h-10">
        {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Bell className="w-4 h-4 mr-2" />}
        Notify Me
      </Button>
    </form>
  );
}