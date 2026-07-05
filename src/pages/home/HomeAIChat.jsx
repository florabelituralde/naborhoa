import React, { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Loader2, Send, MessageCircle, Sparkles } from "lucide-react";

const SUGGESTED_QUESTIONS = [
  "What are the community pool hours?",
  "How do I report a maintenance issue?",
  "When are HOA dues due?",
  "What are the noise rules?",
];

export default function HomeAIChat() {
  const { user, community } = useOutletContext();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [thinking, setThinking] = useState(false);
  const [docs, setDocs] = useState([]);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!community) return;
    Promise.all([
      base44.entities.ChatMessage.filter({ community_id: community.id, user_id: user.id }, "created_date"),
      base44.entities.Document.filter({ community_id: community.id, is_public: true }),
    ]).then(([msgs, communityDocs]) => {
      setMessages(msgs);
      setDocs(communityDocs);
      setLoading(false);
    });
  }, [community, user]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

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
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a friendly HOA assistant for "${community.name}". Answer the homeowner's question based on the uploaded community documents if they are relevant. If the documents don't cover the topic, use your general knowledge of HOA practices and community management to help. Be concise, warm, and helpful. If a question is about a specific issue that requires action, suggest they submit a request.\n\nHomeowner question: ${question}`,
        file_urls: fileUrls.length > 0 ? fileUrls : undefined,
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

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-border bg-card">
        <div className="flex items-center gap-3 max-w-3xl mx-auto">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-semibold">HOA Assistant</h1>
            <p className="text-xs text-muted-foreground">Ask about rules, policies, or community questions</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-3xl mx-auto">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold mb-2">Ask me anything</h2>
              <p className="text-muted-foreground mb-6">I can answer questions about your HOA's rules and policies</p>
              <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto">
                {SUGGESTED_QUESTIONS.map(q => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="text-left p-4 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-sm font-medium"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={msg.id || i} className={`flex gap-3 mb-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-primary" : "bg-primary/10"}`}>
                {msg.role === "user" ? (
                  <span className="text-primary-foreground text-sm font-semibold">{user?.full_name?.[0]?.toUpperCase()}</span>
                ) : (
                  <Sparkles className="w-4 h-4 text-primary" />
                )}
              </div>
              <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-card warm-shadow"}`}>
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}

          {thinking && (
            <div className="flex gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div className="bg-card warm-shadow rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </div>

      <div className="p-4 border-t border-border bg-card">
        <div className="max-w-3xl mx-auto flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
            placeholder="Ask about HOA rules, dues, policies..."
            className="flex-1 h-11 px-4 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <Button onClick={() => sendMessage(input)} disabled={!input.trim() || thinking} className="h-11 px-4">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}