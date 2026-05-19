"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { LandingShell } from "@/components/landing/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function LandingHero() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden pt-[104px] sm:pt-[128px]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-220px] h-[560px] w-[920px] -translate-x-1/2 rounded-full bg-accent-500/[0.09] blur-[110px]" />
        <div className="absolute left-[-160px] top-[260px] h-[420px] w-[420px] rounded-full bg-accent-400/[0.06] blur-[120px]" />
        <div className="absolute right-[-200px] top-[420px] h-[520px] w-[520px] rounded-full bg-accent-600/[0.06] blur-[130px]" />
      </div>

      <LandingShell>
        <motion.div
          initial={reduceMotion ? undefined : { opacity: 0, y: 10 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-[920px] text-center"
        >
          <div className="mb-7 flex items-center justify-center gap-2">
            <Badge variant="accent" className="gap-2 px-3 py-1.5 text-[12px] font-semibold">
              <Sparkles className="h-3.5 w-3.5" />
              Beta — free to join
            </Badge>
            <Badge variant="neutral" className="gap-2 px-3 py-1.5 text-[12px]">
              <Lock className="h-3.5 w-3.5" />
              Private-first
            </Badge>
          </div>

          <h1 className="font-display text-[44px] font-normal leading-[1.03] tracking-[-0.02em] text-ink-100 sm:text-[72px]">
            A quiet place to think —
            <br />
            with grounded answers.
          </h1>
          <p className="mx-auto mt-6 max-w-[680px] text-[16px] leading-[1.75] text-ink-400 sm:text-[18px]">
            EternalNotes is an Obsidian-like workspace for study and research. Import documents, link notes, and ask
            questions with citations — all with privacy-first defaults and an offline/self-host option.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/auth">
              <Button variant="primary" size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>
                Start for free
              </Button>
            </Link>
            <Link href="/auth">
              <Button variant="secondary" size="lg">
                Request a demo
              </Button>
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[13px] text-ink-500">
            <div className="inline-flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-ink-400" />
              Citations + source traceability
            </div>
            <div className="inline-flex items-center gap-2">
              <Lock className="h-4 w-4 text-ink-400" />
              Data stays under your control
            </div>
            <div className="inline-flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-ink-400" />
              Study tools built in
            </div>
          </div>
        </motion.div>
      </LandingShell>
    </section>
  );
}

