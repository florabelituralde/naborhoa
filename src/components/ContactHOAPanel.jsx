import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, CheckCircle2, Send } from "lucide-react";

// Inline panel shown in the AI chat so a homeowner can email the HOA board
// when the assistant can't answer their question.
export default function ContactHOAPanel({ user, community, recipientEmail, ccEmails = [], prefillQuestion }) {
  const [message, setMessage] = useState(prefillQuestion || "");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const send = async () => {
    if (!message.trim() || sending) return;
    setSending(true);
    try {
      const ccLine = ccEmails.length ? `\nCC: ${ccEmails.join(", ")}` : "";
      const body = `A homeowner has submitted an inquiry via the ${community.name} assistant.

From: ${user.full_name || "Homeowner"} (${user.email})${ccLine}

Message:
${message}`;
      const subject = `Homeowner inquiry from ${user.full_name || user.email}`;
      // Send to the HOA contact managing the neighborhood, and copy the board members.
      const recipients = [recipientEmail, ...ccEmails].filter(Boolean);
      await Promise.all(
        recipients.map(to =>
          base44.integrations.Core.SendEmail({ to, subject, body, from_name: community.name })
        )
      );
      setSent(true);
    } catch (err) {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 flex items-center gap-2 text-sm">
        <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
        <span>Your message was sent to the HOA. They'll follow up by email.</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <div className="flex items-center gap-2 mb-2">
        <Mail className="w-4 h-4 text-primary" />
        <p className="text-sm font-medium">Contact the HOA</p>
      </div>
      <p className="text-xs text-muted-foreground mb-2">
        Send your question directly to the board and they'll get back to you.
      </p>
      <textarea
        value={message}
        onChange={e => setMessage(e.target.value)}
        rows={3}
        placeholder="Type your question or concern for the HOA..."
        className="w-full rounded-lg border border-input bg-card text-sm p-2 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
      />
      <Button onClick={send} disabled={!message.trim() || sending} size="sm" className="mt-2 w-full">
        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Send to HOA</>}
      </Button>
    </div>
  );
}