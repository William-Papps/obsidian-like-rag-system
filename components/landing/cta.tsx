import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LandingShell } from "@/components/landing/shell";
import { Button } from "@/components/ui/button";

export function LandingCta() {
  return (
    <section className="mt-20 border-t border-ink-750/40 py-16">
      <LandingShell className="text-center">
        <h2 className="mx-auto max-w-[18ch] font-display text-[40px] font-normal leading-[1.02] tracking-[-0.02em] text-ink-100 sm:text-[56px]">
          Your knowledge is already written down.
        </h2>
        <p className="mx-auto mt-5 max-w-[72ch] text-[16px] leading-8 text-ink-400">
          Index what you have. Ask better questions. Keep the receipts with citations. EternalNotes is built for serious
          study and careful work.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link href="/auth">
            <Button variant="primary" size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>
              Start for free
            </Button>
          </Link>
          <Link href="/auth">
            <Button variant="secondary" size="lg">
              See pricing
            </Button>
          </Link>
        </div>
        <div className="mt-4 text-[12px] text-ink-600">Dark-first. Accessible. Fast.</div>
      </LandingShell>
    </section>
  );
}

