"use client";

import { useEffect, useRef, useState } from "react";
import { Mail, MessageCircle, X } from "lucide-react";

const CONTACT_EMAIL = "discordboteternal@gmail.com";
const DISCORD_URL = "https://discord.gg/6hhxtpzkAE";

export function RequestDemoButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[14px] font-normal text-white/60 transition-colors hover:text-white"
      >
        Request a demo →
      </button>
      {open && <DemoModal onClose={() => setOpen(false)} />}
    </>
  );
}

function DemoModal({ onClose }: { onClose: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-sm rounded-[16px] border border-graphite-rail bg-[#0b0e14] p-8">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-[6px] p-1.5 text-steel transition-colors hover:text-frost"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 className="mb-2 text-[20px] font-semibold text-white">Request a demo</h2>
        <p className="mb-7 text-[14px] leading-[1.5] text-fog">
          Want to see EternalNotes in action? Reach out via email or jump into our Discord and we&apos;ll walk you through it.
        </p>

        <div className="flex flex-col gap-3">
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="flex items-center gap-3 rounded-[10px] border border-graphite-rail bg-white/[0.03] px-4 py-3.5 transition-colors hover:border-smoke hover:bg-white/[0.06]"
          >
            <Mail className="h-4 w-4 shrink-0 text-fog" />
            <div>
              <div className="text-[13px] font-medium text-frost">Email us</div>
              <div className="text-[12px] text-steel">{CONTACT_EMAIL}</div>
            </div>
          </a>

          <a
            href={DISCORD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-[10px] border border-electric-blue/30 bg-electric-blue/[0.05] px-4 py-3.5 transition-colors hover:border-electric-blue/50 hover:bg-electric-blue/[0.09]"
          >
            <MessageCircle className="h-4 w-4 shrink-0 text-electric-blue/70" />
            <div>
              <div className="text-[13px] font-medium text-frost">Join our Discord</div>
              <div className="text-[12px] text-steel">Chat with us and the community</div>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
