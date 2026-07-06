import React from "react";
import { Sparkles, Send, Lock } from "lucide-react";
import { hasModule } from "@/lib/planAccess";

const QUICK_QUESTIONS = [
  "What are the pool hours?",
  "When are HOA dues due?",
  "What are the noise rules?",
];

// Dashboard widget that gives one-tap access to the AI assistant.
// Opens the floating AIChatBubble via a global window event.
// If the community's plan doesn't include the AI assistant, a locked state
// is shown instead.
export default function AIChatWidget({ community }) {
  const openChat = () => window.dispatchEvent(new CustomEvent("open-ai-chat"));

  if (!hasModule(community, "ai_assistant")) {
    return (
      <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-2xl warm-shadow p-6 flex flex-col h-full opacity-90">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <h2 className="font-semibold text-lg">Ask AI Assistant</h2>
        </div>
        <p className="text-sm text-primary-foreground/80 mb-4">
          Get instant answers about your community's rules, dues, and policies.
        </p>
        <div className="mt-auto w-full flex items-center justify-center gap-2 bg-white/15 text-primary-foreground font-medium rounded-xl px-4 py-2.5 border border-white/20">
          <Lock className="w-4 h-4" /> Not available on your plan
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-2xl warm-shadow p-6 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
          <Sparkles className="w-5 h-5" />
        </div>
        <h2 className="font-semibold text-lg">Ask AI Assistant</h2>
      </div>
      <p className="text-sm text-primary-foreground/80 mb-4">
        Get instant answers about your community's rules, dues, and policies.
      </p>

      <div className="space-y-2 mb-4">
        {QUICK_QUESTIONS.map(q => (
          <button
            key={q}
            onClick={openChat}
            className="w-full text-left text-sm px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 transition-colors"
          >
            {q}
          </button>
        ))}
      </div>

      <button
        onClick={openChat}
        className="mt-auto w-full flex items-center justify-center gap-2 bg-white text-primary font-medium rounded-xl px-4 py-2.5 hover:bg-white/90 transition-colors"
      >
        <Send className="w-4 h-4" /> Start a chat
      </button>
    </div>
  );
}