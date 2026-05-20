"use client";

import { useState } from "react";
import { Mail, MessageCircle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "contact@example.com";
const DISCORD_URL = process.env.NEXT_PUBLIC_DISCORD_URL ?? "";

export function RequestDemoButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg px-2 py-1 text-[13px] font-medium text-ink-400 transition-colors hover:text-ink-200 focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
      >
        Request a demo
      </button>
      <DemoModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function DemoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal
      open={open}
      onOpenChange={(v) => (v ? undefined : onClose())}
      title="Request a demo"
      description="Want to see EternalNotes in action? Email us or join Discord and we’ll walk you through it."
      className="max-w-[520px]"
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <a href={`mailto:${CONTACT_EMAIL}`}>
            <Button variant="primary" leftIcon={<Mail className="h-4 w-4" />}>
              Email us
            </Button>
          </a>
        </div>
      }
    >
      <div className="grid gap-3">
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="flex items-center gap-3 rounded-2xl border border-ink-750/60 bg-ink-950/20 px-4 py-4 transition-all duration-200 ease-premium hover:border-ink-700/70 hover:bg-ink-925/50 focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-ink-750/50 bg-ink-925/50 text-ink-300">
            <Mail className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-ink-100">Email</div>
            <div className="truncate text-[12px] text-ink-500">{CONTACT_EMAIL}</div>
          </div>
        </a>

        <a
          href={DISCORD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-2xl border border-accent-400/25 bg-accent-500/10 px-4 py-4 transition-all duration-200 ease-premium hover:border-accent-400/40 hover:bg-accent-500/14 focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-accent-400/25 bg-accent-500/12 text-accent-300">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-ink-100">Discord</div>
            <div className="text-[12px] text-ink-500">Join the community for quick walkthroughs.</div>
          </div>
        </a>
      </div>
    </Modal>
  );
}

