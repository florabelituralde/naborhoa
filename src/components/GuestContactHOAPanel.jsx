import React, { useState } from "react";
import { Mail } from "lucide-react";

// Contact fallback shown in the public guest chat when the assistant cannot
// ground an answer in the community documents. Guests are not authenticated,
// so this opens the visitor's email client (mailto) prefilled with their
// question — the public equivalent of the in-app ContactHOAPanel.
export default function GuestContactHOAPanel({ community, recipientEmail, prefillQuestion }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(prefillQuestion || "");

  const subject = `Inquiry about ${community?.name || "the community"}`;
  const body = `Name: ${name || "(your name)"}\nReply-to: ${email || "(your email)"}\n\nMessage:\n${message}`;
  const mailto = `mailto:${recipientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <div className="rounded-xl border border-border bg-card p-3 max-w-[75%]">
      <div className="flex items-center gap-2 mb-2">
        <Mail className="w-4 h-4 text-primary" />
        <p className="text-sm font-medium">Contact the HOA</p>
      </div>
      <p className="text-xs text-muted-foreground mb-2">
        The assistant couldn't find this in the community documents. Reach out and the board will help.
      </p>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        className="w-full rounded-lg border border-input bg-background text-sm p-2 mb-2 focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Your email"
        type="email"
        className="w-full rounded-lg border border-input bg-background text-sm p-2 mb-2 focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        placeholder="Type your question or concern for the HOA..."
        className="w-full rounded-lg border border-input bg-background text-sm p-2 mb-2 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
      />
      <a
        href={mailto}
        className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        <Mail className="w-4 h-4" /> Email the HOA
      </a>
    </div>
  );
}