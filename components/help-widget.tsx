"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, ChevronRight } from "lucide-react";

type Message = { from: "user" | "bot"; text: string };

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is EternalNotes?",
    a: "EternalNotes is a local-first knowledge base. Add notes or import documents, index them, then ask questions in plain English. Answers are grounded in your content with citations."
  },
  {
    q: "How does the AI work?",
    a: "Documents are split into chunks and embedded via Ollama (running locally). When you ask a question, the most relevant chunks are retrieved and the model answers only from those excerpts — no data leaves your machine."
  },
  {
    q: "Is my data private?",
    a: "Yes. All AI runs locally via Ollama. Your notes never leave your machine unless you configure a remote Ollama instance yourself."
  },
  {
    q: "What file types can I import?",
    a: "You can paste plain text, import PDFs, Word documents (.docx), plain text files, Markdown files, or images (OCR via Ollama moondream)."
  },
  {
    q: "How do I enable AI features?",
    a: "Make sure Ollama is running and the required models are pulled: nomic-embed-text (indexing), llama3.2:3b (answers), moondream (OCR). See the README for setup instructions."
  },
  {
    q: "How do I get started?",
    a: "Create an account, add your first note, click Index, then use Ask to query your notes. You'll have grounded answers in seconds."
  },
  {
    q: "Where is my data stored?",
    a: "All notes and settings are stored in a SQLite database at data/study.db in the project directory. Back that file up to keep your notes safe."
  }
];

const GREETING = "Hi! I'm here to help. Pick a question below or type your own.";

function findAnswer(input: string): string {
  const lower = input.toLowerCase();
  const match = FAQS.find((faq) =>
    faq.q.toLowerCase().split(" ").filter((w) => w.length > 3).some((word) => lower.includes(word))
  );
  if (match) return match.a;
  return "Good question! If it's not covered here, contact your instance owner/admin for help.";
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
        <div className="flex h-[480px] w-[340px] flex-col overflow-hidden rounded-2xl border border-graphite-rail bg-[#0b0e14]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-graphite-rail bg-black px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-lg"
                style={{ background: "linear-gradient(to right bottom in oklab, rgb(146,129,247) 0%, rgb(154,84,220) 100%)" }}
              >
                <MessageCircle className="h-3.5 w-3.5 text-white" />
              </div>
              <div>
                <div className="text-sm font-semibold text-ink-100">Help</div>
                <div className="flex items-center gap-1 text-[10px] text-ink-500">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-success-400" />
                  Self-serve help
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
                    className="flex w-full items-center justify-between rounded-xl border border-graphite-rail bg-black/50 px-3 py-2 text-left text-xs text-ink-300 transition-colors hover:border-electric-blue/30 hover:bg-graphite-rail/40 hover:text-ink-100"
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
          <div className="border-t border-graphite-rail p-3">
            <div className="flex items-center gap-2 rounded-xl border border-graphite-rail bg-black/60 px-3 py-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask a question..."
                className="flex-1 bg-transparent text-sm text-ink-100 placeholder-ink-600 outline-none"
              />
              <button
                onClick={() => send(input)}
                disabled={!input.trim()}
                className="rounded-lg border border-electric-blue p-1.5 text-white transition-colors hover:bg-electric-blue/10 disabled:opacity-40"
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
        className="flex h-14 w-14 items-center justify-center rounded-full transition-all hover:scale-105 active:scale-95"
        style={{ background: "linear-gradient(to right bottom in oklab, rgb(146,129,247) 0%, rgb(154,84,220) 100%)" }}
        aria-label="Open help chat"
      >
        {open ? <X className="h-5 w-5 text-white" /> : <MessageCircle className="h-5 w-5 text-white" />}
      </button>
    </div>
  );
}
