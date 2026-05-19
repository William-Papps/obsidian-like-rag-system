"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, ChevronRight, FileText, Search, Sparkles } from "lucide-react";
import { useState } from "react";
import { LandingShell } from "@/components/landing/shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const STEPS = [
  {
    key: "import",
    title: "Import documents",
    desc: "Add PDFs and notes. EternalNotes indexes your content for retrieval.",
    icon: <FileText className="h-5 w-5" />
  },
  {
    key: "ask",
    title: "Ask questions",
    desc: "Query your knowledge base and get answers grounded in your sources.",
    icon: <Search className="h-5 w-5" />
  },
  {
    key: "study",
    title: "Study with feedback",
    desc: "Generate quizzes and flashcards that help you retain what matters.",
    icon: <Sparkles className="h-5 w-5" />
  }
] as const;

type StepKey = (typeof STEPS)[number]["key"];

export function LandingHowItWorks() {
  const [active, setActive] = useState<StepKey>("import");
  const reduceMotion = useReducedMotion();

  const step = STEPS.find((s) => s.key === active) ?? STEPS[0];

  return (
    <section className="mt-20">
      <LandingShell>
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-600">How it works</div>
            <h2 className="mt-3 text-[30px] font-semibold leading-[1.12] text-ink-100 sm:text-[38px]">
              A workflow you can explain.
            </h2>
            <p className="mt-4 max-w-[52ch] text-[15px] leading-7 text-ink-400">
              Retrieval is only useful when you can trust it. EternalNotes keeps provenance visible—so you can validate
              outputs and keep moving.
            </p>

            <div className="mt-7 space-y-2">
              {STEPS.map((s) => {
                const selected = s.key === active;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setActive(s.key)}
                    className={[
                      "flex w-full items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-left transition-all duration-200 ease-premium focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]",
                      selected ? "border-accent-400/35 bg-accent-500/10" : "border-ink-750/50 bg-ink-950/10 hover:bg-ink-925/40"
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-3">
                      <div className={["flex h-9 w-9 items-center justify-center rounded-xl border", selected ? "border-accent-400/35 bg-accent-500/15 text-accent-300" : "border-ink-750/50 bg-ink-950/20 text-ink-400"].join(" ")}>
                        {s.icon}
                      </div>
                      <div>
                        <div className="text-[14px] font-semibold text-ink-100">{s.title}</div>
                        <div className="text-[13px] leading-6 text-ink-500">{s.desc}</div>
                      </div>
                    </div>
                    <ChevronRight className={selected ? "h-4 w-4 text-accent-300" : "h-4 w-4 text-ink-600"} />
                  </button>
                );
              })}
            </div>
          </div>

          <Card className="p-6">
            <div className="text-[12px] font-semibold text-ink-500">Step preview</div>
            <div className="mt-3 text-[18px] font-semibold text-ink-100">{step.title}</div>
            <div className="mt-2 text-[14px] leading-7 text-ink-400">{step.desc}</div>

            <div className="mt-6 rounded-2xl border border-ink-750/50 bg-ink-950/20 p-5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={reduceMotion ? undefined : { opacity: 0, y: 10 }}
                  animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: 10 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-2 text-[13px] font-semibold text-ink-200">
                    <CheckCircle2 className="h-4 w-4 text-accent-300" />
                    Grounded output
                  </div>
                  <div className="text-[13px] leading-6 text-ink-500">
                    Citations always point back to the note excerpts used. You stay in control of what gets trusted.
                  </div>
                  <div className="pt-1">
                    <Button variant="soft" size="md">
                      See the workspace
                    </Button>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </Card>
        </div>
      </LandingShell>
    </section>
  );
}

