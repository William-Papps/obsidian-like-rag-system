"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, ChevronRight } from "lucide-react";

type Message = { from: "user" | "bot"; text: string };

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is EternalNotes?",
    a: "EternalNotes is an AI-powered knowledge base for teams. You add your documents, index them, and then ask questions in plain English — every answer is grounded in your content with exact citations."
  },
  {
    q: "How does the AI work?",
    a: "Your documents are broken into chunks and embedded using OpenAI's embedding models. When you ask a question, the most relevant chunks are retrieved and an LLM generates an answer sourced only from those chunks — no hallucinations."
  },
  {
    q: "Is my data private?",
    a: "Yes. EternalNotes is self-hosted — your documents live on your own server and never get sent to any third party except your chosen AI provider (OpenAI) for indexing and querying."
  },
  {
    q: "How do team workspaces work?",
    a: "Create a workspace, invite colleagues by email, and everyone can read and query the same shared documents. Each person keeps their own personal space too."
  },
  {
    q: "What file types can I import?",
    a: "You can paste plain text, import PDFs and Word documents (.docx), or write directly in the built-in markdown editor."
  },
  {
    q: "How much does it cost?",
    a: "EternalNotes itself is free to use. You'll need an OpenAI API key for AI features — typical usage costs a few cents per month for a small team."
  },
  {
    q: "How do I get started?",
    a: "Sign up for a free account, add your first document, click Reindex, then head to the Ask tab and type your first question. You'll have answers in under a minute."
  },
  {
    q: "Do I need technical skills to set this up?",
    a: "No. Sign up, paste in your OpenAI API key in settings, and you're ready. No server configuration or code required for end users."
  }
];

const GREETING = "Hi there 👋 I'm here to help. Pick a question below or type your own.";

function findAnswer(input: string): string {
  const lower = input.toLowerCase();
  const match = FAQS.find((faq) =>
    faq.q.toLowerCase().split(" ").filter((w) => w.length > 3).some((word) => lower.includes(word))
  );
  if (match) return match.a;
  return "Good question! For anything not covered here, email us or sign up and use the in-app help. We're happy to help you get set up.";
}

export function HelpWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{ from: "bot", text: GREETING }]);
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  function send(text: string) {
    if (!text.trim()) return;
    const userMsg: Message = { from: "user", text: text.trim() };
    const botMsg: Message = { from: "bot", text: findAnswer(text) };
    setMessages((prev) => [...prev, userMsg, botMsg]);
    setInput("");
    setShowSuggestions(false);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Chat panel */}
      {open ? (
        <div className="flex h-[480px] w-[340px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-ink-900 shadow-panel">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.07] bg-ink-875 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-500">
                <MessageCircle className="h-3.5 w-3.5 text-white" />
              </div>
              <div>
                <div className="text-sm font-semibold text-ink-100">Help</div>
                <div className="flex items-center gap-1 text-[10px] text-ink-500">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-success-400" />
                  Always online
                </div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-ink-500 transition-colors hover:bg-white/5 hover:text-ink-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.from === "user"
                      ? "rounded-br-sm bg-accent-500 text-white"
                      : "rounded-bl-sm bg-ink-800/80 text-ink-200"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {/* Suggested questions */}
            {showSuggestions && (
              <div className="space-y-1.5 pt-1">
                {FAQS.slice(0, 5).map((faq, i) => (
                  <button
                    key={i}
                    onClick={() => send(faq.q)}
                    className="flex w-full items-center justify-between rounded-xl border border-white/[0.07] bg-ink-800/50 px-3 py-2 text-left text-xs text-ink-300 transition-colors hover:border-accent-500/30 hover:bg-ink-800 hover:text-ink-100"
                  >
                    <span>{faq.q}</span>
                    <ChevronRight className="ml-2 h-3 w-3 shrink-0 text-ink-600" />
                  </button>
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-white/[0.07] p-3">
            <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-ink-800/60 px-3 py-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask a question…"
                className="flex-1 bg-transparent text-sm text-ink-100 placeholder-ink-600 outline-none"
              />
              <button
                onClick={() => send(input)}
                disabled={!input.trim()}
                className="rounded-lg bg-accent-500 p-1.5 text-white transition-colors hover:bg-accent-400 disabled:opacity-40"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-500 shadow-glow transition-all hover:bg-accent-400 hover:scale-105 active:scale-95"
        aria-label="Open help chat"
      >
        {open ? <X className="h-5 w-5 text-white" /> : <MessageCircle className="h-5 w-5 text-white" />}
      </button>
    </div>
  );
}
