import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, Send, MessageCircle, Sparkles, X, Mail } from "lucide-react";
import ContactHOAPanel from "@/components/ContactHOAPanel";
import { isUnanswered } from "@/lib/hoaAssistant";
import { hasModule } from "@/lib/planAccess";

const SUGGESTED_QUESTIONS = [
  "What are the pool hours?",
  "When are HOA dues due?",
  "What are the noise rules?",
  "How do I report an issue?",
];

// Floating AI assistant. Answers strictly from the community's HOA-provided documents.
export default function AIChatBubble({ user, community, hideButton = false }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [thinking, setThinking] = useState(false);
  const [docs, setDocs] = useState([]);
  const [hoaEmail, setHoaEmail] = useState(null);
  const [ccEmails, setCcEmails] = useState([]);
  const [boardMembers, setBoardMembers] = useState([]);
  const [managerEmail, setManagerEmail] = useState(null);
  const [managerName, setManagerName] = useState(null);
  const scrollRef = useRef(null);

  const aiEnabled = community ? hasModule(community, "ai_assistant") : false;

  useEffect(() => {
    if (!community || !user || !aiEnabled) return;
    Promise.all([
      base44.entities.ChatMessage.filter({ community_id: community.id, user_id: user.id }, "created_date"),
      base44.entities.Document.filter({ community_id: community.id, is_public: true }),
      base44.entities.BoardMember.filter({ community_id: community.id }),
      community.created_by_id ? base44.entities.User.filter({ id: community.created_by_id }).catch(() => []) : Promise.resolve([]),
    ]).then(([msgs, communityDocs, board, managers]) => {
      setMessages(msgs);
      setDocs(communityDocs);
      // Primary recipient: the HOA contact managing this neighborhood page (community creator)
      const managerUser = managers?.[0] || null;
      const manager = managerUser?.email || null;
      const boardEmails = board.map(b => b.email).filter(Boolean);
      const primary = manager || boardEmails[0] || null;
      setHoaEmail(primary);
      setManagerEmail(manager);
      setManagerName(managerUser?.full_name || null);
      setBoardMembers(board);
      // CC the board members (excluding the primary recipient to avoid duplicates)
      setCcEmails(boardEmails.filter(e => e !== primary));
    }).catch(() => {}).finally(() => setLoading(false));
  }, [community, user]);

  useEffect(() => {
    if (open) scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking, open]);

  // Allow other parts of the app (e.g. dashboard widget) to open the assistant
  useEffect(() => {
    const handleOpen = () => { if (aiEnabled) setOpen(true); };
    window.addEventListener("open-ai-chat", handleOpen);
    return () => window.removeEventListener("open-ai-chat", handleOpen);
  }, []);

  // Close on Escape (keyboard fallback)
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const sendMessage = async (question) => {
    if (!question.trim() || thinking) return;
    const userMsg = { role: "user", content: question, community_id: community.id, user_id: user.id };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setThinking(true);

    try {
      const savedUserMsg = await base44.entities.ChatMessage.create(userMsg);
      setMessages(prev => prev.map(m => m === userMsg ? { ...savedUserMsg, role: "user" } : m));

      const fileUrls = docs.map(d => d.file_url).filter(Boolean);
      const hasDocs = fileUrls.length > 0;
      const docIndex = docs.length
        ? docs.map((d, i) => `${i + 1}. ${d.title}${d.category ? ` (${d.category})` : ""}`).join("\n")
        : "";

      const contactLines = [];
      if (managerEmail) contactLines.push(`- HOA Admin: ${managerName ? managerName + " — " : ""}${managerEmail}`);
      boardMembers.filter(b => b.email).forEach(b => {
        const roleLabel = b.role ? ` (${b.role.replace(/_/g, " ")})` : "";
        contactLines.push(`- Board member: ${b.name}${roleLabel} — ${b.email}`);
      });
      const contactBlock = contactLines.length
        ? `\nHOA contact details (share these when a homeowner asks how to reach the HOA or a board member; do not invent contact info not listed here):\n${contactLines.join("\n")}\n`
        : "";

      const guardrails = `You are the HOA assistant for the community "${community.name}". You must follow these rules strictly:
      1. ONLY answer questions about this community's rules, policies, dues, or procedures using information found in the official HOA documents provided to you${hasDocs ? "" : " (note: no documents have been provided by the HOA yet)"}.
      2. NEVER invent, assume, guess, or use outside/general knowledge to state a policy, rule, fee, deadline, or procedure. If the documents do not clearly state it, you do not know it — do not fill gaps with typical HOA practices. Never invent document names or section numbers that do not appear in the provided documents.
      3. Search ALL of the provided documents before answering. When you find the answer, cite the source: name the document title and the section (if identifiable), then quote the exact wording from that section, then give a brief plain-language interpretation that does not extend or change the original meaning. Example: "According to the <Document Title>, <Section>: \"<exact quoted text>\". In other words, <interpretation>."
      4. If the answer is not clearly stated in any provided document, or you cannot point to a specific document and section that states it, respond exactly with: "I don't have that information in the community's official documents. Please contact your HOA board for an answer." Do not add a made-up answer, a guessed section, or general HOA advice before or after this.
      5. You may help with general, non-policy tasks (e.g. suggesting the homeowner submit a maintenance request through the app) without citing documents.
      6. Be concise, warm, and helpful.
      ${docIndex ? `\nHOA documents available (cite by these titles only):\n${docIndex}\n` : ""}${contactBlock}
      Homeowner question: ${question}`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: guardrails,
        file_urls: hasDocs ? fileUrls : undefined,
      });

      const assistantContent = typeof response === "string" ? response : response?.response || response?.content || "I'm sorry, I couldn't process that. Please try again.";
      const assistantMsg = { role: "assistant", content: assistantContent, community_id: community.id, user_id: user.id };
      const savedAssistantMsg = await base44.entities.ChatMessage.create(assistantMsg);
      setMessages(prev => [...prev, { ...savedAssistantMsg, role: "assistant" }]);
    } catch (err) {
      const errorMsg = "I'm having trouble right now. Please try again in a moment.";
      const savedErr = await base44.entities.ChatMessage.create({ role: "assistant", content: errorMsg, community_id: community.id, user_id: user.id });
      setMessages(prev => [...prev, { ...savedErr, role: "assistant" }]);
    }
    setThinking(false);
  };

  if (!community || !user || !aiEnabled) return null;

  return (
    <>
      {/* Floating toggle button */}
      {!open && !hideButton && (
        <button
          onClick={() => setOpen(true)}
          className="fixed right-5 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-5 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground warm-shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
          aria-label="Open HOA assistant"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <>
        {/* Desktop backdrop — click anywhere to close */}
        <div
          className="hidden md:block fixed inset-0 z-[60] bg-black/40"
          onClick={() => setOpen(false)}
        />
        {/* Panel: floating card on desktop, fullscreen on mobile */}
        <div className="fixed inset-0 z-[61] w-full h-full bg-card flex flex-col overflow-hidden md:inset-auto md:right-5 md:bottom-5 md:w-[400px] md:max-w-[calc(100vw-2.5rem)] md:h-[600px] md:max-h-[calc(100vh-2.5rem)] md:rounded-2xl md:warm-shadow-lg md:border md:border-border">
          {/* Header */}
          <div className="relative z-10 flex items-center justify-between gap-2 px-4 py-3 border-b border-border bg-primary text-primary-foreground shrink-0 safe-top safe-x">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm leading-tight">HOA Assistant</h3>
                <p className="text-[11px] text-primary-foreground/80 leading-tight truncate">{community.name}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-white/15 hover:bg-white/25 active:bg-white/30 touch-manipulation"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="max-w-2xl mx-auto w-full">
            {loading ? (
              <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : (
              <>
                {messages.length === 0 && (
                  <div className="text-center py-6">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <MessageCircle className="w-6 h-6 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-4 px-2">Ask about your community's official rules and policies</p>
                    <div className="grid grid-cols-1 gap-2">
                      {SUGGESTED_QUESTIONS.map(q => (
                        <button
                          key={q}
                          onClick={() => sendMessage(q)}
                          className="text-left p-2.5 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all text-sm"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((msg, i) => {
                  const cantAnswer = msg.role === "assistant" && isUnanswered(msg.content);
                  const prevUserMsg = [...messages.slice(0, i)].reverse().find(m => m.role === "user");
                  return (
                  <div key={msg.id || i}>
                    <div className={`flex gap-2 mb-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-primary" : "bg-primary/10"}`}>
                        {msg.role === "user" ? (
                          <span className="text-primary-foreground text-xs font-semibold">{user?.full_name?.[0]?.toUpperCase()}</span>
                        ) : (
                          <Sparkles className="w-3.5 h-3.5 text-primary" />
                        )}
                      </div>
                      <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                    {cantAnswer && hoaEmail && (
                      <div className="ml-9 mb-3 max-w-[85%]">
                        <ContactHOAPanel user={user} community={community} recipientEmail={hoaEmail} ccEmails={ccEmails} prefillQuestion={prevUserMsg?.content} />
                      </div>
                    )}
                  </div>
                  );
                })}

                {thinking && (
                  <div className="flex gap-2 mb-3">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="bg-muted rounded-2xl px-3 py-2">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={scrollRef} />
              </>
            )}
            </div>
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border shrink-0 safe-bottom safe-x">
            <div className="flex gap-2 max-w-2xl mx-auto">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
                placeholder="Ask about rules, dues, policies..."
                className="flex-1 h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <Button onClick={() => sendMessage(input)} disabled={!input.trim() || thinking} className="h-10 px-3">
                <Send className="w-4 h-4" />
              </Button>
            </div>
            {hoaEmail && (
              <p className="max-w-2xl mx-auto mt-2 text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                <Mail className="w-3 h-3" /> Need a person? Contact the HOA at{" "}
                <a href={`mailto:${hoaEmail}`} className="text-primary hover:underline">{hoaEmail}</a>
              </p>
            )}
          </div>
          </>
        </div>
        </>
      )}
    </>
  );
}