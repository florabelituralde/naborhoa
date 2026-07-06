import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";

// Invoice & plans mode for the shared HOA/Homeowner assistant bubble.
// Backed by the `invoice_assistant` agent (explanation-only, no payments).
const SUGGESTIONS = [
  "What do I currently owe?",
  "Explain my latest invoice",
  "How do HOA invoices work?",
  "What are the Nabor plans?",
];

export default function AIChatInvoiceMode({ user, community }) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const existing = await base44.agents.listConversations({ agent_name: "invoice_assistant" });
        let conv = existing && existing.length > 0 ? existing[0] : null;
        if (!conv) {
          conv = await base44.agents.createConversation({
            agent_name: "invoice_assistant",
            metadata: { name: "Invoice Assistant" },
          });
        }
        if (cancelled) return;
        setConversation(conv);
        setMessages(conv.messages || []);
      } catch {
        if (!cancelled) setConversation(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!conversation?.id) return;
    const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
      setMessages(data.messages || []);
    });
    return () => unsubscribe();
  }, [conversation?.id]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || !conversation || sending) return;
    setInput("");
    setSending(true);
    try {
      await base44.agents.addMessage(conversation, { role: "user", content });
    } catch {
      /* surfaced via subscription */
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="flex-1 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 py-4" ref={scrollRef}>
        <div className="max-w-2xl mx-auto w-full">
          {messages.length === 0 ? (
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground mb-4 px-2">Ask about charges, balances, or Nabor plans</p>
              <div className="grid grid-cols-1 gap-2">
                {SUGGESTIONS.map(q => (
                  <button key={q} onClick={() => send(q)} className="text-left p-2.5 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all text-sm">{q}</button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((m, i) => <MessageBubble key={m.id || i} message={m} user={user} />)}
            </div>
          )}
        </div>
      </div>
      <div className="p-3 border-t border-border shrink-0 safe-bottom safe-x">
        <div className="flex gap-2 max-w-2xl mx-auto">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask about a charge or plan…"
            disabled={sending}
          />
          <Button onClick={() => send()} disabled={sending || !input.trim()} className="h-10 px-3">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </>
  );
}

function MessageBubble({ message, user }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex gap-2 mb-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isUser ? "bg-primary" : "bg-primary/10"}`}>
        {isUser ? (
          <span className="text-primary-foreground text-xs font-semibold">{user?.full_name?.[0]?.toUpperCase()}</span>
        ) : (
          <Sparkles className="w-3.5 h-3.5 text-primary" />
        )}
      </div>
      <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${isUser ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
        {message.content ? (
          isUser ? (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          ) : (
            <ReactMarkdown className="text-sm prose prose-sm max-w-none prose-p:my-1 prose-a:text-primary">{message.content}</ReactMarkdown>
          )
        ) : (
          <span className="text-sm italic opacity-70">Thinking…</span>
        )}
        {message.tool_calls?.map((tc, idx) => <ToolDisplay key={idx} toolCall={tc} />)}
      </div>
    </div>
  );
}

function ToolDisplay({ toolCall }) {
  const [expanded, setExpanded] = useState(false);
  const status = toolCall.status || "";
  const failed = /failed|error/i.test(status);
  const running = /pending|running|in_progress/i.test(status);
  const hide = toolCall.display_projection?.hide_details && toolCall.display_projection?.details_redacted;
  const label = toolCall.display_projection?.label || (toolCall.name || "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  let parsedArgs = toolCall.arguments_string; try { parsedArgs = JSON.parse(toolCall.arguments_string); } catch { /* keep raw */ }
  let parsedResults = toolCall.results; try { parsedResults = JSON.parse(toolCall.results); } catch { /* keep raw */ }
  const activeLabel = toolCall.display_projection?.active_label || "Working…";
  const errorLabel = toolCall.display_projection?.error_label || "Failed";
  return (
    <div className="mt-2 text-xs border border-border/60 rounded-lg bg-background/40">
      <button type="button" onClick={() => !hide && setExpanded(e => !e)} className="w-full flex items-center gap-2 px-3 py-1.5">
        {running ? <Loader2 className="w-3 h-3 animate-spin" /> : failed ? "⚠️" : "✓"}
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{running ? activeLabel : failed ? errorLabel : "done"}</span>
      </button>
      {!hide && expanded && (
        <div className="px-3 pb-2 space-y-1.5">
          {parsedArgs && <div><p className="text-muted-foreground">Parameters:</p><pre className="bg-muted/40 rounded p-1.5 overflow-x-auto whitespace-pre-wrap break-words">{JSON.stringify(parsedArgs, null, 2)}</pre></div>}
          {parsedResults !== undefined && <div><p className="text-muted-foreground">Result:</p><pre className="bg-muted/40 rounded p-1.5 overflow-x-auto whitespace-pre-wrap break-words">{typeof parsedResults === "string" ? parsedResults : JSON.stringify(parsedResults, null, 2)}</pre></div>}
        </div>
      )}
    </div>
  );
}