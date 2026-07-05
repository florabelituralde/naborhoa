import React, { useState, useRef, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Home, Loader2, Send, Sparkles, MessageCircle, ArrowLeft } from "lucide-react";

const SUGGESTED_QUESTIONS = [
  "What are the community pool hours?",
  "How do I report a maintenance issue?",
  "When are HOA dues due?",
  "What are the noise rules?",
];

export default function GuestChat() {
  const { joinCode } = useParams();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  const sendMessage = async (question) => {
    if (!question.trim() || thinking) return;
    const userMsg = { role: "user", content: question };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setThinking(true);

    try {
      const res = await base44.functions.invoke("public-ai-chat", {
        join_code: joinCode,
        question,
        history: messages,
      });
      const answer = res.data?.answer || "I'm having trouble right now. Please try again.";
      setMessages(prev => [...prev, { role: "assistant", content: answer }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", content: "I'm having trouble right now. Please try again." }]);
    }
    setThinking(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="h-16 bg-primary flex items-center px-4 sticky top-0 z-10">
        <Link to={`/c/${joinCode}`} className="flex items-center gap-2 text-white hover:text-white/80">
          <ArrowLeft className="w-5 h-5" />
          <Home className="w-5 h-5" />
        </Link>
        <div className="flex-1 text-center">
          <h1 className="text-white font-semibold">HOA Assistant</h1>
        </div>
        <div className="w-9" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold mb-2">Ask me anything</h2>
              <p className="text-muted-foreground mb-6">No sign-up needed — get instant answers about HOA rules and policies</p>
              <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto">
                {SUGGESTED_QUESTIONS.map(q => (
                  <button key={q} onClick={() => sendMessage(q)} className="text-left p-4 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-sm font-medium">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 mb-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-primary" : "bg-primary/10"}`}>
                {msg.role === "user" ? <span className="text-primary-foreground text-sm font-semibold">U</span> : <Sparkles className="w-4 h-4 text-primary" />}
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
          <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }} placeholder="Ask about HOA rules, dues, policies..." className="flex-1 h-11 px-4 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          <Button onClick={() => sendMessage(input)} disabled={!input.trim() || thinking} className="h-11 px-4"><Send className="w-4 h-4" /></Button>
        </div>
      </div>
    </div>
  );
}