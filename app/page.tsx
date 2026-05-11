import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { getCurrentUserOptional } from "@/lib/auth";
import { Workspace } from "@/components/workspace";
import Link from "next/link";
import { HelpWidget } from "@/components/help-widget";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RootPage() {
  noStore();
  const user = await getCurrentUserOptional();
  if (user) return <Workspace />;
  return <LandingPage />;
}

function LandingPage() {
  return (
    <div className="min-h-screen bg-ink-950 text-ink-100">

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-ink-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-500">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 3h4v10H3zM9 3h4v4H9zM9 9h4v4H9z" fill="white" fillOpacity="0.9" />
              </svg>
            </div>
            <span className="text-base font-semibold tracking-tight text-ink-100">EternalNotes</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/auth"
              className="text-sm font-medium text-ink-400 transition-colors hover:text-ink-100"
            >
              Sign in
            </Link>
            <Link
              href="/auth"
              className="rounded-lg bg-accent-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-400"
            >
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-24">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-accent-500/10 blur-[120px]" />
        </div>
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent-500/25 bg-accent-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-accent-300">
            AI-powered knowledge management
          </div>
          <h1 className="mb-6 text-5xl font-bold leading-[1.1] tracking-tight text-ink-100 sm:text-6xl">
            Your team&apos;s documents,<br />
            <span className="bg-gradient-to-r from-accent-400 to-violet-300 bg-clip-text text-transparent">
              instantly queryable
            </span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-ink-400">
            Add your reports, SOPs, and research. Index them once. Then ask questions in plain English and get grounded answers with exact citations - no hallucinations, no guessing.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/auth"
              className="rounded-xl bg-accent-500 px-8 py-3.5 text-base font-semibold text-white shadow-glow transition-colors hover:bg-accent-400"
            >
              Get started free
            </Link>
            <Link
              href="/auth"
              className="rounded-xl border border-white/10 bg-white/5 px-8 py-3.5 text-base font-semibold text-ink-200 transition-colors hover:bg-white/10"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* App preview placeholder */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-ink-900/60 shadow-panel backdrop-blur">
          <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
            <div className="h-3 w-3 rounded-full bg-danger-400/60" />
            <div className="h-3 w-3 rounded-full bg-amber-400/60" />
            <div className="h-3 w-3 rounded-full bg-success-400/60" />
            <div className="ml-3 h-5 w-48 rounded bg-white/5" />
          </div>
          <div className="grid grid-cols-[200px_1fr_280px]">
            <div className="border-r border-white/[0.06] p-4 space-y-2">
              {["Q3 Strategy", "Onboarding SOPs", "Product Roadmap", "Market Research", "Meeting Notes"].map((name, i) => (
                <div key={i} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${i === 0 ? "bg-accent-500/15" : ""}`}>
                  <div className="h-3.5 w-3.5 rounded bg-white/10" />
                  <div className={`h-3 rounded ${i === 0 ? "w-24 bg-accent-400/60" : "bg-white/10"}`} style={{ width: `${60 + i * 12}px` }} />
                </div>
              ))}
            </div>
            <div className="p-6 space-y-3">
              <div className="h-4 w-48 rounded bg-white/10" />
              <div className="h-3 w-full rounded bg-white/5" />
              <div className="h-3 w-4/5 rounded bg-white/5" />
              <div className="h-3 w-full rounded bg-white/5" />
              <div className="mt-6 h-3 w-3/5 rounded bg-white/5" />
              <div className="h-3 w-full rounded bg-white/5" />
              <div className="h-3 w-2/3 rounded bg-white/5" />
            </div>
            <div className="border-l border-white/[0.06] p-4 space-y-3">
              <div className="rounded-lg bg-accent-500/10 border border-accent-500/20 p-3">
                <div className="mb-2 h-3 w-24 rounded bg-accent-400/40" />
                <div className="h-8 w-full rounded bg-white/5" />
              </div>
              <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3 space-y-1.5">
                <div className="h-2.5 w-full rounded bg-white/10" />
                <div className="h-2.5 w-4/5 rounded bg-white/10" />
                <div className="h-2.5 w-full rounded bg-white/10" />
                <div className="mt-2 h-2.5 w-2/3 rounded bg-accent-400/30" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-ink-100">Everything your team needs</h2>
          <p className="mt-3 text-ink-400">Built for teams that run on documents and can&apos;t afford wrong answers.</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: "M9 3H5a2 2 0 00-2 2v4m6-6h6a2 2 0 012 2v4M9 3v10m0 0h6m-6 0H3m6 0v4m0-4h6m0 0v4",
              title: "Grounded AI answers",
              description: "Ask anything in plain English. Every answer is backed by exact quotes from your documents — no hallucinations, ever."
            },
            {
              icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
              title: "Team workspaces",
              description: "Invite colleagues into shared workspaces. Everyone queries the same documents, from anywhere."
            },
            {
              icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
              title: "Import anything",
              description: "Paste text, upload PDFs, Word docs, and more. EternalNotes extracts the text and helps you index it for grounded Q&A."
            },
            {
              icon: "M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z",
              title: "Cited responses",
              description: "Every answer links back to the exact source document and excerpt. Click to jump straight to it."
            },
            {
              icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
              title: "Knowledge checks",
              description: "Generate Q&A quizzes from your documents to validate team understanding of SOPs and policies."
            },
            {
              icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
              title: "Private by default",
              description: "Your documents never leave your infrastructure. Self-hosted, fully under your control."
            }
          ].map((feature, i) => (
            <div key={i} className="rounded-2xl border border-white/[0.07] bg-ink-900/40 p-6 backdrop-blur">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-accent-500/15">
                <svg className="h-5 w-5 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={feature.icon} />
                </svg>
              </div>
              <h3 className="mb-2 text-base font-semibold text-ink-100">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-ink-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-white/[0.06] bg-ink-925/50 py-24">
        <div className="mx-auto max-w-4xl px-6">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-ink-100">Up and running in minutes</h2>
            <p className="mt-3 text-ink-400">No complex setup. No training data. Just your documents.</p>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              { step: "01", title: "Add your documents", body: "Upload PDFs, paste text, or write directly in the editor. Organize by project or team." },
              { step: "02", title: "Index with one click", body: "Hit Reindex and your content is embedded and ready to query in seconds." },
              { step: "03", title: "Ask anything", body: "Type a question. Get a grounded answer with citations you can click through to verify." }
            ].map((item, i) => (
              <div key={i} className="relative pl-4">
                <div className="absolute left-0 top-0 h-full w-px bg-gradient-to-b from-accent-500/60 to-transparent" />
                <div className="mb-3 text-xs font-bold tracking-[0.2em] text-accent-400">{item.step}</div>
                <h3 className="mb-2 text-base font-semibold text-ink-100">{item.title}</h3>
                <p className="text-sm leading-relaxed text-ink-400">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-ink-100">Simple pricing</h2>
          <p className="mt-3 text-ink-400">Start free. Upgrade when your team grows.</p>
        </div>
        <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-2">

          {/* Personal */}
          <div className="flex flex-col rounded-2xl border border-white/[0.08] bg-ink-900/40 p-8">
            <div className="mb-6">
              <div className="mb-1 text-xs font-bold uppercase tracking-widest text-ink-500">Personal</div>
              <div className="flex items-end gap-1.5">
                <span className="text-5xl font-bold text-ink-100">$0</span>
                <span className="mb-1.5 text-sm text-ink-500">/ month</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink-400">Full access to all features. Bring your own OpenAI API key.</p>
            </div>
            <ul className="mb-8 flex-1 space-y-3">
              {[
                "Unlimited documents",
                "All AI tools (BYOK)",
                "Team workspaces",
                "Version history",
                "No monthly cost"
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm text-ink-300">
                  <svg className="h-4 w-4 shrink-0 text-success-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/auth"
              className="block rounded-xl border border-white/10 bg-white/5 py-3 text-center text-sm font-semibold text-ink-200 transition-colors hover:bg-white/10"
            >
              Get started free
            </Link>
          </div>

          {/* Pro */}
          <div className="relative flex flex-col rounded-2xl border border-accent-500/40 bg-gradient-to-b from-accent-500/10 to-ink-900/60 p-8">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="rounded-full bg-accent-500 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white">
                Most popular
              </span>
            </div>
            <div className="mb-6">
              <div className="mb-1 text-xs font-bold uppercase tracking-widest text-accent-400">Pro</div>
              <div className="flex items-end gap-1.5">
                <span className="text-5xl font-bold text-ink-100">$12</span>
                <span className="mb-1.5 text-sm text-ink-500">/ month</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink-400">Everything in Personal plus hosted AI — no API key needed.</p>
            </div>
            <ul className="mb-8 flex-1 space-y-3">
              {[
                "1500 Ask queries / month",
                "600 Knowledge Checks / month",
                "600 Training Cards / month",
                "600 Briefings / month",
                "200 OCR scans / month",
                "Team workspaces"
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm text-ink-300">
                  <svg className="h-4 w-4 shrink-0 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/auth"
              className="block rounded-xl bg-accent-500 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-accent-400"
            >
              Get started
            </Link>
          </div>

        </div>
      </section>

      {/* CTA */}
      <section className="py-28">
        <div className="relative mx-auto max-w-2xl px-6 text-center">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-1/2 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-500/8 blur-[100px]" />
          </div>
          <h2 className="relative mb-4 text-4xl font-bold tracking-tight text-ink-100">
            Ready to unlock your knowledge base?
          </h2>
          <p className="relative mb-10 text-lg text-ink-400">
            Free to start. No credit card required.
          </p>
          <Link
            href="/auth"
            className="relative inline-block rounded-xl bg-accent-500 px-10 py-4 text-base font-semibold text-white shadow-glow transition-colors hover:bg-accent-400"
          >
            Create your workspace
          </Link>
        </div>
      </section>

      <HelpWidget />

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-10">
        <div className="mx-auto max-w-6xl px-6 space-y-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent-500">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <path d="M3 3h4v10H3zM9 3h4v4H9zM9 9h4v4H9z" fill="white" fillOpacity="0.9" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-ink-300">EternalNotes</span>
            </div>
            <div className="text-xs text-ink-600">© {new Date().getFullYear()} EternalNotes. All rights reserved.</div>
            <Link href="/auth" className="text-sm font-medium text-ink-400 hover:text-ink-100">Sign in →</Link>
          </div>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {[
              { href: "/legal/terms", label: "Terms" },
              { href: "/legal/privacy", label: "Privacy" },
              { href: "/legal/cookies", label: "Cookies" },
              { href: "/legal/acceptable-use", label: "Acceptable Use" },
              { href: "/legal/ai", label: "AI Disclaimer" },
              { href: "/legal/refunds", label: "Refunds" },
              { href: "/legal/contact", label: "Contact" },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="text-xs text-ink-600 hover:text-ink-400 transition-colors">
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>

    </div>
  );
}
