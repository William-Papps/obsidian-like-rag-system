import Link from "next/link";
import { Check } from "lucide-react";
import { LandingShell } from "@/components/landing/shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const INCLUDED = [
  "Ask AI — RAG search with citations",
  "Quiz + flashcard generation",
  "Briefings and summaries",
  "Document import (PDF, DOCX, TXT)",
  "Image OCR (vision model)",
  "Team workspaces",
  "No limits, no quotas, no ads"
];

export function LandingPricing() {
  return (
    <section className="mt-20">
      <LandingShell>
        <div className="text-center">
          <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-600">Pricing</div>
          <h2 className="mt-3 text-[32px] font-semibold leading-[1.12] text-ink-100 sm:text-[42px]">Free. Always.</h2>
          <p className="mx-auto mt-4 max-w-[72ch] text-[15px] leading-7 text-ink-400">
            EternalNotes is a free, open platform. No subscriptions, no quotas, no credit card — ever.
          </p>
        </div>

        <div className="mt-10 mx-auto max-w-md">
          <Card className="border-accent-400/30 bg-accent-500/8">
            <div className="p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[14px] font-semibold text-ink-200">Everything included</div>
                  <div className="mt-2 flex items-end gap-2">
                    <div className="text-[44px] font-semibold leading-none text-ink-100">$0</div>
                    <div className="pb-1 text-[13px] text-ink-500">forever</div>
                  </div>
                </div>
              </div>

              <ul className="mt-6 space-y-3">
                {INCLUDED.map((b) => (
                  <li key={b} className="flex items-center gap-2 text-[13px] text-ink-300">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full border border-ink-750/60 bg-ink-950/20">
                      <Check className="h-3.5 w-3.5 text-accent-300" />
                    </span>
                    {b}
                  </li>
                ))}
              </ul>

              <div className="mt-7">
                <Link href="/auth">
                  <Button variant="primary" size="lg" className="w-full">
                    Get started — it&apos;s free
                  </Button>
                </Link>
                <div className="mt-3 text-center text-[12px] text-ink-600">No credit card. No plan selection. Just sign up.</div>
              </div>
            </div>
          </Card>
        </div>
      </LandingShell>
    </section>
  );
}
