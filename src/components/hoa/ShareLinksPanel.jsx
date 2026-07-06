import React from "react";
import CopyLinkButton from "@/components/CopyLinkButton";
import { Users, CreditCard } from "lucide-react";

export default function ShareLinksPanel({ community, showInvoiceNote }) {
  const origin = window.location.origin;
  const joinUrl = `${origin}/c/${community.join_code}`;
  const payUrl = `${origin}/pay`;

  return (
    <div className="bg-card rounded-2xl warm-shadow p-5 mb-6">
      <h3 className="font-semibold mb-1">Shareable Links</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Share these with residents so they can join the community or pay as guests — no account needed.
      </p>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <Users className="w-4 h-4 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium">Join Community</p>
              <p className="text-xs text-muted-foreground truncate max-w-[200px] sm:max-w-xs">{joinUrl}</p>
            </div>
          </div>
          <CopyLinkButton url={joinUrl} label="Copy" />
        </div>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <CreditCard className="w-4 h-4 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium">Guest Payment Portal</p>
              <p className="text-xs text-muted-foreground truncate max-w-[200px] sm:max-w-xs">{payUrl}</p>
            </div>
          </div>
          <CopyLinkButton url={payUrl} label="Copy" />
        </div>
      </div>
      {showInvoiceNote && (
        <p className="mt-3 text-xs text-muted-foreground">
          Tip: Use the link button on any invoice below to share a direct payment link for that bill (dues, fines, fees, or assessments).
        </p>
      )}
    </div>
  );
}