"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BookOpen, Brain, FileText, Layers3, Users } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { LandingShell } from "@/components/landing/shell";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type PreviewKey = "capture" | "ask" | "study" | "teams";

const PREVIEWS: Array<{
  key: PreviewKey;
  label: string;
  icon: ReactNode;
  title: string;
  desc: string;
}> = [
  {
    key: "capture",
    label: "Capture",
    icon: <FileText className="h-4 w-4" />,
    title: "Import once, keep context forever.",
    desc: "Bring in PDFs, docs, and notes. Everything becomes searchable, linkable, and ready for grounded retrieval."
  },
  {
    key: "ask",
    label: "Ask",
    icon: <Brain className="h-4 w-4" />,
    title: "Ask questions. Get citations.",
    desc: "EternalNotes answers with excerpts and traceable sources so you can verify every claim."
  },
  {
    key: "study",
    label: "Study",
    icon: <BookOpen className="h-4 w-4" />,
    title: "Turn knowledge into recall.",
    desc: "Generate quizzes, flashcards, and daily review prompts from the notes you already wrote."
  },
  {
    key: "teams",
    label: "Teams",
    icon: <Users className="h-4 w-4" />,
    title: "A workspace your team can trust.",
    desc: "Shared workspaces with clear boundaries and private-by-default behavior—without turning into a chat app."
  }
];

function PreviewFrame({ mode }: { mode: PreviewKey }) {
  const reduceMotion = useReducedMotion();
  const rows = useMemo(() => {
    switch (mode) {
      case "capture":
        return [
          { k: "Vault", v: "Research / Spring Term" },
          { k: "Docs", v: "PDFs, articles, lecture notes" },
          { k: "Index", v: "Ready (grounded retrieval)" }
        ];
      case "ask":
        return [
          { k: "Question", v: "What are the key assumptions?" },
          { k: "Answer", v: "Summarized with citations" },
          { k: "Sources", v: "3 notes cited (hover to preview)" }
        ];
      case "study":
        return [
          { k: "Mode", v: "Quiz + flashcards" },
          { k: "Focus", v: "What you missed last time" },
          { k: "Tempo", v: "Short sessions, high retention" }
        ];
      case "teams":
        return [
          { k: "Workspace", v: "Lab Group / Shared vault" },
          { k: "Sharing", v: "Scoped notes + citations" },
          { k: "Audit", v: "Clear activity trail" }
        ];
    }
  }, [mode]);

  const content = (
    <div className="grid gap-3">
      <div className="flex items-center justify-between rounded-2xl border border-ink-750/50 bg-ink-950/30 px-4 py-3">
        <div className="flex items-center gap-2 text-[12px] font-semibold text-ink-300">
          <Layers3 className="h-4 w-4 text-ink-500" />
          Workspace preview
        </div>
        <div className="text-[12px] text-ink-600">Interactive (tabs)</div>
      </div>
      <div className="grid gap-2">
        {rows.map((r) => (
          <div key={r.k} className="rounded-2xl border border-ink-750/50 bg-ink-925/55 px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-600">{r.k}</div>
            <div className="mt-1 text-[14px] font-medium text-ink-200">{r.v}</div>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-accent-400/25 bg-accent-500/10 px-4 py-3 text-[13px] leading-6 text-ink-300">
        <span className="font-semibold text-accent-300">Grounded by design:</span> answers show citations and excerpts so you can
        verify them.
      </div>
    </div>
  );

  if (reduceMotion) return content;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
    >
      {content}
    </motion.div>
  );
}

export function LandingProductPreview() {
  const [tab, setTab] = useState<PreviewKey>("ask");
  const reduceMotion = useReducedMotion();

  const meta = PREVIEWS.find((p) => p.key === tab) ?? PREVIEWS[0];
  return (
    <section className="mt-16">
      <LandingShell className="grid items-start gap-10 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-600">Product preview</div>
          <h2 className="mt-3 text-[28px] font-semibold leading-[1.15] text-ink-100 sm:text-[34px]">
            Built like a research instrument.
          </h2>
          <p className="mt-4 max-w-[46ch] text-[15px] leading-7 text-ink-400">
            Everything is designed to reduce cognitive load: clear hierarchy, predictable navigation, and fast ways to
            move between notes, sources, and study modes.
          </p>

          <div className="mt-6">
            <Tabs value={tab} onValueChange={(v) => setTab(v as PreviewKey)}>
              <TabsList className="w-full justify-between">
                {PREVIEWS.map((p) => (
                  <TabsTrigger key={p.key} value={p.key} className="flex-1 justify-center gap-2">
                    <span className="text-ink-500">{p.icon}</span>
                    <span>{p.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value={tab}>
                <div className="mt-6 rounded-2xl border border-ink-750/50 bg-ink-950/20 p-5">
                  <div className="text-[16px] font-semibold text-ink-100">{meta.title}</div>
                  <div className="mt-2 text-[14px] leading-6 text-ink-400">{meta.desc}</div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <Card className="relative overflow-hidden p-6">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-16 top-10 h-40 w-40 rounded-full bg-accent-500/10 blur-[60px]" />
            <div className="absolute -right-20 bottom-0 h-52 w-52 rounded-full bg-accent-400/10 blur-[70px]" />
          </div>
          <div className="relative">
            <div className="mb-4 flex items-center gap-2 text-[12px] font-semibold text-ink-500">
              <Brain className="h-4 w-4" />
              Interactive preview
            </div>
            <AnimatePresence mode="wait">
              <motion.div key={tab} initial={false}>
                <PreviewFrame mode={tab} />
              </motion.div>
            </AnimatePresence>
            {reduceMotion ? null : (
              <div className="mt-4 text-[12px] text-ink-600">
                Tip: use keyboard focus to switch tabs.
              </div>
            )}
          </div>
        </Card>
      </LandingShell>
    </section>
  );
}
