import Link from "next/link";
import { Check } from "lucide-react";
import { LandingShell } from "@/components/landing/shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const TIERS = [
  {
    name: "Personal",
    price: "$0",
    meta: "Free",
    desc: "Private notes + grounded preview features.",
    bullets: ["Local-first workflow", "Import documents", "Citations in answers", "Study tools basics"],
    highlight: false
  },
  {
    name: "Pro",
    price: "$12",
    meta: "per month",
    desc: "Higher limits and team-ready features.",
    bullets: ["Higher monthly limits", "Team workspaces", "Usage + billing insights", "Priority support"],
    highlight: true
  }
];

export function LandingPricing() {
  return (
    <section className="mt-20">
      <LandingShell>
        <div className="text-center">
          <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-600">Pricing</div>
          <h2 className="mt-3 text-[32px] font-semibold leading-[1.12] text-ink-100 sm:text-[42px]">Simple and predictable.</h2>
          <p className="mx-auto mt-4 max-w-[72ch] text-[15px] leading-7 text-ink-400">
            Start free. Upgrade when you need higher limits, billing controls, or team workspaces.
          </p>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          {TIERS.map((t) => (
            <Card key={t.name} className={t.highlight ? "border-accent-400/30 bg-accent-500/8" : undefined}>
              <div className="p-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[14px] font-semibold text-ink-200">{t.name}</div>
                    <div className="mt-2 flex items-end gap-2">
                      <div className="text-[44px] font-semibold leading-none text-ink-100">{t.price}</div>
                      <div className="pb-1 text-[13px] text-ink-500">{t.meta}</div>
                    </div>
                  </div>
                  {t.highlight ? <Badge variant="accent">Most popular</Badge> : <Badge variant="neutral">Get started</Badge>}
                </div>

                <div className="mt-4 text-[14px] leading-7 text-ink-400">{t.desc}</div>

                <ul className="mt-6 space-y-3">
                  {t.bullets.map((b) => (
                    <li key={b} className="flex items-center gap-2 text-[13px] text-ink-300">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full border border-ink-750/60 bg-ink-950/20">
                        <Check className="h-3.5 w-3.5 text-accent-300" />
                      </span>
                      {b}
                    </li>
                  ))}
                </ul>

                <div className="mt-7">
                  <Link href="/auth?next=%2Faccount%3Fsection%3Dbilling">
                    <Button variant={t.highlight ? "primary" : "secondary"} size="lg" className="w-full">
                      Continue
                    </Button>
                  </Link>
                  <div className="mt-3 text-center text-[12px] text-ink-600">No credit card required to start.</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </LandingShell>
    </section>
  );
}

