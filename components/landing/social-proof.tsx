import { LandingShell } from "@/components/landing/shell";
import { Badge } from "@/components/ui/badge";

const TRUST = [
  { title: "Private-first", desc: "Local vaults + predictable sharing." },
  { title: "Grounded answers", desc: "Citations and excerpts—no handwaving." },
  { title: "Offline/self-host", desc: "Run on your own machine or server." },
  { title: "Team workspaces", desc: "Shared knowledge with clear boundaries." }
];

export function LandingSocialProof() {
  return (
    <section className="mt-14 border-y border-ink-750/40 bg-ink-925/30 py-10">
      <LandingShell className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TRUST.map((t) => (
          <div key={t.title} className="rounded-2xl border border-ink-750/40 bg-ink-950/20 px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[13px] font-semibold text-ink-200">{t.title}</div>
              <Badge variant="neutral">Built for research</Badge>
            </div>
            <div className="mt-2 text-[13px] leading-6 text-ink-500">{t.desc}</div>
          </div>
        ))}
      </LandingShell>
    </section>
  );
}

