import React, { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Send, Loader2, Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function HomeInvoiceAssistant() {
  const { user, community } = useOutletContext();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  // Create or resume a single conversation for this agent per user.
  useEffect(() => {
    if (!user) return;
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
  }, [user]);

  // Subscribe to streaming updates for the active conversation.
  useEffect(() => {
    if (!conversation?.id) return;
    const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
      setMessages(data.messages || []);
    });
    return () => unsubscribe();
  }, [conversation?.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || !conversation || sending) return;
    setInput("");
    setSending(true);
    try {
      await base44.agents.addMessage(conversation, { role: "user", content });
    } catch {
      // error surfaces via subscription / unchanged messages
    } finally {
      setSending(false);
    }
  };

  const suggestions = [
    "What do I currently owe?",
    "Explain my latest invoice",
    "Set up auto-pay",
    "Why was I charged an assessment?",
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto flex flex-col h-full">
      <PageHeader
        title="Invoice Assistant"
        subtitle="Ask about your charges, explain a bill, or pay and set up auto-pay"
      />

      <div className="flex-1 overflow-y-auto no-scrollbar bg-card rounded-2xl warm-shadow p-4 sm:p-6 mb-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-7 h-7 text-primary" />
            </div>
            <h3 className="font-semibold mb-1">Hi{user?.full_name ? `, ${user.full_name.split(" ")[0]}` : ""}! 👋</h3>
            <p className="text-sm text-muted-foreground mb-5">
              I can explain your HOA charges and help you pay. Try one of these:
            </p>
            <div className="grid sm:grid-cols-2 gap-2 max-w-md mx-auto">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left text-sm p-3 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((m, i) => (
              <MessageBubble key={i} message={m} />
            ))}
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); send(); }}
        className="flex gap-2"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about a charge or payment…"
          disabled={sending}
        />
        <Button type="submit" disabled={sending || !input.trim()}>
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </form>
    </div>
  );
}

function MessageBubble({ message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isUser ? "bg-primary/10" : "bg-primary"}`}>
        {isUser ? <User className="w-4 h-4 text-primary" /> : <Bot className="w-4 h-4 text-primary-foreground" />}
      </div>
      <div className={`rounded-2xl px-4 py-2.5 max-w-[85%] ${isUser ? "bg-primary text-primary-foreground" : "bg-muted/60"}`}>
        {message.content ? (
          isUser ? (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          ) : (
            <ReactMarkdown className="text-sm prose prose-sm max-w-none prose-p:my-1 prose-a:text-primary prose-a:font-semibold">{message.content}</ReactMarkdown>
          )
        ) : (
          <span className="text-sm italic opacity-70">Thinking…</span>
        )}
        {message.tool_calls?.map((tc, idx) => (
          <ToolDisplay key={idx} toolCall={tc} />
        ))}
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

  const label = toolCall.display_projection?.label
    || (toolCall.name || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  let parsedArgs = toolCall.arguments_string;
  try { parsedArgs = JSON.parse(toolCall.arguments_string); } catch (_) { /* keep raw */ }
  let parsedResults = toolCall.results;
  try { parsedResults = JSON.parse(toolCall.results); } catch (_) { /* keep raw */ }

  const activeLabel = toolCall.display_projection?.active_label || "Working…";
  const errorLabel = toolCall.display_projection?.error_label || "Failed";

  return (
    <div className="mt-2 text-xs border border-border/60 rounded-lg bg-background/40">
      <button
        type="button"
        onClick={() => !hide && setExpanded((e) => !e)}
        className="w-full flex items-center gap-2 px-3 py-1.5"
      >
        {running ? <Loader2 className="w-3 h-3 animate-spin" /> : failed ? "⚠️" : "✓"}
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{running ? activeLabel : failed ? errorLabel : "done"}</span>
      </button>
      {!hide && expanded && (
        <div className="px-3 pb-2 space-y-1.5">
          {parsedArgs && (
            <div>
              <p className="text-muted-foreground">Parameters:</p>
              <pre className="bg-muted/40 rounded p-1.5 overflow-x-auto whitespace-pre-wrap break-words">{JSON.stringify(parsedArgs, null, 2)}</pre>
            </div>
          )}
          {parsedResults !== undefined && (
            <div>
              <p className="text-muted-foreground">Result:</p>
              <pre className="bg-muted/40 rounded p-1.5 overflow-x-auto whitespace-pre-wrap break-words">{typeof parsedResults === "string" ? parsedResults : JSON.stringify(parsedResults, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}