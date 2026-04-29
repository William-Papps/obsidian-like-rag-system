"use client";

import { useState } from "react";
import { MessageSquare, Send, Sparkles } from "lucide-react";

export default function ChatPage() {
  const [input, setInput] = useState("");

  return (
    <div className="h-screen flex flex-col bg-ink-950 text-ink-100 overflow-hidden">
      <div className="h-11 border-b border-ink-875 flex items-center gap-3 px-4 shrink-0">
        <MessageSquare className="w-4 h-4 text-accent-400 shrink-0" />
        <span className="text-sm font-semibold">AI Chat</span>
        <span className="px-2 py-0.5 bg-accent-500/10 border border-accent-500/20 text-accent-300 text-[11px] font-semibold rounded-full">
          Coming soon
        </span>
      </div>

      <div className="flex-1 flex items-center justify-center px-8">
        <div className="max-w-sm text-center">
          <div className="w-14 h-14 rounded-2xl bg-ink-925 border border-ink-875 flex items-center justify-center mx-auto mb-5">
            <Sparkles className="w-7 h-7 text-accent-400" />
          </div>
          <h2 className="text-lg font-semibold text-ink-200 mb-3">
            Dedicated AI Chat coming soon
          </h2>
          <p className="text-sm text-ink-500 leading-6 mb-5">
            A full conversation interface with history, project context, file
            attachments, and multi-model support.
          </p>
          <p className="text-sm text-ink-600">
            In the meantime, use the{" "}
            <a href="/notes" className="text-accent-400 hover:text-accent-300 transition-colors">
              Study panel
            </a>{" "}
            in Notes for AI-powered Q&amp;A over your knowledge base.
          </p>
        </div>
      </div>

      <div className="border-t border-ink-875 p-4 shrink-0">
        <div className="flex items-center gap-3 bg-ink-925 border border-ink-800 rounded-xl px-4 py-3">
          <input
            disabled
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="AI Chat coming soon..."
            className="flex-1 bg-transparent text-sm text-ink-600 placeholder:text-ink-700 outline-none cursor-not-allowed"
          />
          <button
            disabled
            className="w-8 h-8 rounded-lg bg-ink-875 flex items-center justify-center text-ink-700 cursor-not-allowed"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
