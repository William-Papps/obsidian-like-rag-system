import { Brain, FileStack, ShieldCheck, Sparkles, Users } from "lucide-react";
import { LandingShell } from "@/components/landing/shell";

const FEATURES = [
  {
    icon: <ShieldCheck className="h-5 w-5" />,
    title: "Private-first by default",
    desc: "Keep your notes under your control. Sensitive work stays where it belongs."
  },
  {
    icon: <Brain className="h-5 w-5" />,
    title: "Grounded RAG with citations",
    desc: "Answers include sources and excerpts so you can verify and trust the output."
  },
  {
    icon: <FileStack className="h-5 w-5" />,
    title: "Docs + notes in one place",
    desc: "Import PDFs and documents, then connect them to your own writing."
  },
  {
    icon: <Sparkles className="h-5 w-5" />,
    title: "Study modes that feel native",
    desc: "Quizzes, flashcards, and summaries designed for recall—not gimmicks."
  },
  {
    icon: <Users className="h-5 w-5" />,
    title: "Team workspaces",
    desc: "Share knowledge without losing provenance or boundaries."
  }
];

export function LandingFeatures() {
  return (
    <section className="mt-20">
      <LandingShell>
        <div className="grid items-end gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-600">Why EternalNotes</div>
            <h2 className="mt-3 text-[30px] font-semibold leading-[1.12] text-ink-100 sm:text-[38px]">
              Designed for trust, not novelty.
            </h2>
          </div>
          <p className="max-w-[70ch] text-[15px] leading-7 text-ink-400">
            A modern research workspace should feel calm and precise. EternalNotes keeps the interface predictable while
            making grounded retrieval and study workflows obvious and fast.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-ink-750/50 bg-ink-925/45 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-ink-750/50 bg-ink-950/20 text-ink-300">
                {f.icon}
              </div>
              <div className="mt-4 text-[15px] font-semibold text-ink-100">{f.title}</div>
              <div className="mt-2 text-[14px] leading-7 text-ink-500">{f.desc}</div>
            </div>
          ))}
        </div>
      </LandingShell>
    </section>
  );
}

