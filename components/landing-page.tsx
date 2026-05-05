"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useRef, type ReactNode } from "react";

function FadeIn({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-ink-950 text-ink-100">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-ink-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent-500 to-accent-600 shadow-glow">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 3h4v10H3zM9 3h4v4H9zM9 9h4v4H9z" fill="white" fillOpacity="0.9" />
              </svg>
            </div>
            <span className="bg-gradient-to-r from-accent-300 to-accent-400 bg-clip-text text-base font-bold tracking-tight text-transparent">EternalNotes</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth" className="text-sm font-medium text-ink-400 transition-colors hover:text-ink-100">
              Sign in
            </Link>
            <Link href="/auth" className="rounded-lg bg-accent-500 px-4 py-2 text-sm font-semibold text-white shadow-glow transition-colors hover:bg-accent-400">
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pb-20 pt-32">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-[700px] w-[1000px] -translate-x-1/2 rounded-full bg-accent-500/12 blur-[140px]" />
          <div className="absolute -left-32 top-48 h-[400px] w-[500px] rounded-full bg-accent-600/8 blur-[120px]" />
          <div className="absolute -right-32 top-64 h-[350px] w-[450px] rounded-full bg-violet-500/6 blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent-500/25 bg-accent-500/10 px-4 py-1.5"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-accent-400" />
            <span className="text-xs font-semibold uppercase tracking-widest text-accent-300">AI-powered knowledge management</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
            className="mb-6 text-5xl font-bold leading-[1.08] tracking-tight text-ink-100 sm:text-6xl lg:text-7xl"
          >
            Your team&apos;s documents,
            <br />
            <span className="bg-gradient-to-r from-accent-400 via-violet-300 to-accent-300 bg-clip-text text-transparent">
              instantly queryable
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.16 }}
            className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-ink-400"
          >
            Add your reports, SOPs, and research. Index them once. Ask questions in plain English and get grounded answers with exact citations — no hallucinations, no guessing.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.24 }}
            className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
          >
            <Link href="/auth" className="rounded-xl bg-accent-500 px-8 py-3.5 text-base font-semibold text-white shadow-glow transition-all hover:-translate-y-px hover:bg-accent-400">
              Get started free
            </Link>
            <Link href="/auth" className="rounded-xl border border-white/10 bg-white/5 px-8 py-3.5 text-base font-semibold text-ink-200 transition-colors hover:bg-white/10">
              Sign in
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <FadeIn className="mx-auto max-w-3xl px-6 pb-20">
        <div className="grid grid-cols-3 divide-x divide-white/[0.06] overflow-hidden rounded-2xl border border-white/[0.08] bg-ink-900/40 backdrop-blur">
          {[
            { value: "Self-hosted", label: "Your infrastructure, your data" },
            { value: "Cited answers", label: "Every response links to source" },
            { value: "Zero hallucinations", label: "Grounded in your documents" }
          ].map((stat, i) => (
            <div key={i} className="flex flex-col items-center gap-1 px-6 py-5 text-center">
              <div className="text-sm font-bold text-ink-100">{stat.value}</div>
              <div className="text-xs leading-relaxed text-ink-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </FadeIn>

      {/* App mockup */}
      <FadeIn className="mx-auto max-w-5xl px-6 pb-28">
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-ink-900/60 shadow-[0_32px_80px_rgba(0,0,0,0.5)] backdrop-blur">
          {/* Window chrome */}
          <div className="flex items-center gap-2 border-b border-white/[0.06] bg-ink-950/60 px-4 py-3">
            <div className="h-3 w-3 rounded-full bg-red-400/60" />
            <div className="h-3 w-3 rounded-full bg-amber-400/60" />
            <div className="h-3 w-3 rounded-full bg-green-400/60" />
            <div className="ml-4 flex h-6 flex-1 items-center gap-2 rounded-md bg-white/[0.04] px-3">
              <div className="h-2 w-2 rounded-full bg-white/10" />
              <div className="h-2 w-32 rounded bg-white/10" />
            </div>
          </div>

          <div className="grid grid-cols-[200px_1fr_300px] divide-x divide-white/[0.05]">
            {/* Sidebar */}
            <div className="bg-ink-950/40 p-3 space-y-0.5">
              <div className="mb-3 flex items-center gap-2 px-2 py-1">
                <div className="h-2.5 w-2.5 rounded-full bg-accent-500/60" />
                <div className="h-2.5 w-20 rounded bg-white/10" />
              </div>
              {[
                { label: "Q3 Strategy", active: true },
                { label: "Onboarding SOPs", active: false },
                { label: "Product Roadmap", active: false },
                { label: "Market Research", active: false },
                { label: "Meeting Notes", active: false }
              ].map((item, i) => (
                <div key={i} className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 ${item.active ? "bg-accent-500/15 border border-accent-500/20" : ""}`}>
                  <div className={`h-3 w-3 rounded shrink-0 ${item.active ? "bg-accent-400/50" : "bg-white/10"}`} />
                  <div className={`h-2.5 rounded ${item.active ? "bg-accent-300/60" : "bg-white/10"}`} style={{ width: `${44 + i * 14}px` }} />
                </div>
              ))}
            </div>

            {/* Editor */}
            <div className="p-6 space-y-2 bg-ink-900/20">
              <div className="h-5 w-44 rounded bg-ink-100/10 mb-4" />
              <div className="h-2.5 w-full rounded bg-white/[0.05]" />
              <div className="h-2.5 w-4/5 rounded bg-white/[0.05]" />
              <div className="h-2.5 w-full rounded bg-white/[0.05]" />
              <div className="h-2.5 w-3/4 rounded bg-white/[0.05]" />
              <div className="mt-4 h-2.5 w-2/5 rounded bg-accent-400/25" />
              <div className="h-2.5 w-full rounded bg-white/[0.05]" />
              <div className="h-2.5 w-5/6 rounded bg-white/[0.05]" />
              <div className="h-2.5 w-full rounded bg-white/[0.05]" />
              <div className="mt-4 h-2.5 w-2/5 rounded bg-accent-400/25" />
              <div className="h-2.5 w-full rounded bg-white/[0.05]" />
              <div className="h-2.5 w-3/5 rounded bg-white/[0.05]" />
            </div>

            {/* AI Panel */}
            <div className="bg-ink-950/30 flex flex-col">
              {/* Panel header */}
              <div className="border-b border-white/[0.06] px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-md bg-accent-500/20 border border-accent-500/30 flex items-center justify-center">
                    <div className="h-2.5 w-2.5 rounded-full bg-accent-400/80" />
                  </div>
                  <div className="h-2.5 w-28 rounded bg-white/15" />
                </div>
              </div>
              {/* Tab row */}
              <div className="flex border-b border-white/[0.05] px-2 pt-1.5 pb-0 gap-1">
                {["Ask", "Check", "Cards", "Brief"].map((t, i) => (
                  <div key={t} className={`px-2.5 pb-1.5 pt-0.5 text-[10px] font-semibold rounded-t ${i === 0 ? "text-accent-300 border-b-2 border-accent-500" : "text-white/20"}`}>{t}</div>
                ))}
              </div>
              {/* Conversation */}
              <div className="flex-1 space-y-3 p-3">
                {/* User query bubble */}
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-xl rounded-tr-sm bg-accent-500/20 border border-accent-500/25 px-3 py-2">
                    <div className="h-2 w-40 rounded bg-accent-300/50" />
                    <div className="mt-1 h-2 w-28 rounded bg-accent-300/35" />
                  </div>
                </div>
                {/* AI response */}
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 space-y-1.5">
                  <div className="h-2 w-full rounded bg-white/15" />
                  <div className="h-2 w-5/6 rounded bg-white/15" />
                  <div className="h-2 w-full rounded bg-white/15" />
                  <div className="h-2 w-4/5 rounded bg-white/15" />
                  {/* Citation */}
                  <div className="mt-2.5 flex items-center gap-1.5 rounded-lg border border-accent-500/20 bg-accent-500/8 px-2.5 py-1.5">
                    <div className="h-2 w-2 rounded-full bg-accent-400/60 shrink-0" />
                    <div className="h-2 w-24 rounded bg-accent-400/40" />
                    <div className="ml-auto h-2 w-8 rounded bg-accent-400/25" />
                  </div>
                  <div className="flex items-center gap-1.5 rounded-lg border border-accent-500/20 bg-accent-500/8 px-2.5 py-1.5">
                    <div className="h-2 w-2 rounded-full bg-accent-400/60 shrink-0" />
                    <div className="h-2 w-32 rounded bg-accent-400/40" />
                    <div className="ml-auto h-2 w-8 rounded bg-accent-400/25" />
                  </div>
                </div>
                {/* Input */}
                <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2">
                  <div className="h-2 flex-1 rounded bg-white/10" />
                  <div className="h-5 w-5 rounded-lg bg-accent-500/40" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </FadeIn>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 pb-28">
        <FadeIn className="mb-14 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-ink-100 sm:text-4xl">Everything your team needs</h2>
          <p className="mt-3 text-ink-400">Built for teams that run on documents and can&apos;t afford wrong answers.</p>
        </FadeIn>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
              description: "Paste text, upload PDFs, Word docs, and more. EternalNotes extracts and indexes the content automatically."
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
            <FadeIn key={i} delay={i * 0.05}>
              <div className="group relative h-full overflow-hidden rounded-2xl border border-white/[0.07] bg-ink-900/40 p-6 backdrop-blur transition-colors hover:border-accent-500/25 hover:bg-ink-900/60">
                <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <div className="absolute -top-8 left-1/2 h-24 w-32 -translate-x-1/2 rounded-full bg-accent-500/10 blur-2xl" />
                </div>
                <div className="relative mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-accent-500/20 bg-accent-500/12">
                  <svg className="h-5 w-5 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={feature.icon} />
                  </svg>
                </div>
                <h3 className="relative mb-2 text-base font-semibold text-ink-100">{feature.title}</h3>
                <p className="relative text-sm leading-relaxed text-ink-400">{feature.description}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-white/[0.06] bg-ink-925/40 py-24">
        <div className="mx-auto max-w-4xl px-6">
          <FadeIn className="mb-14 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-ink-100 sm:text-4xl">Up and running in minutes</h2>
            <p className="mt-3 text-ink-400">No complex setup. No training data. Just your documents.</p>
          </FadeIn>
          <div className="grid gap-10 sm:grid-cols-3">
            {[
              { step: "01", title: "Add your documents", body: "Upload PDFs, paste text, or write directly in the editor. Organize by project or team." },
              { step: "02", title: "Index with one click", body: "Hit Reindex and your content is embedded and ready to query in seconds." },
              { step: "03", title: "Ask anything", body: "Type a question. Get a grounded answer with citations you can click through to verify." }
            ].map((item, i) => (
              <FadeIn key={i} delay={i * 0.1}>
                <div className="relative pl-5">
                  <div className="absolute left-0 top-0 h-full w-px bg-gradient-to-b from-accent-500/70 via-accent-500/30 to-transparent" />
                  <div className="mb-3 text-xs font-bold tracking-[0.2em] text-accent-400">{item.step}</div>
                  <h3 className="mb-2 text-base font-semibold text-ink-100">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-ink-400">{item.body}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <FadeIn className="mb-14 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-ink-100 sm:text-4xl">Simple pricing</h2>
          <p className="mt-3 text-ink-400">Start free. Upgrade when your team needs hosted AI.</p>
        </FadeIn>
        <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-2">
          {/* Personal */}
          <FadeIn delay={0.05}>
            <div className="flex h-full flex-col rounded-2xl border border-white/[0.08] bg-ink-900/40 p-8 backdrop-blur">
              <div className="mb-6">
                <div className="mb-1 text-xs font-bold uppercase tracking-widest text-ink-500">Personal</div>
                <div className="flex items-end gap-1.5">
                  <span className="text-5xl font-bold text-ink-100">$0</span>
                  <span className="mb-2 text-sm text-ink-500">/ month</span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-ink-400">Full access to all features. Bring your own OpenAI API key.</p>
              </div>
              <ul className="mb-8 flex-1 space-y-3">
                {["Unlimited documents", "All AI tools (BYOK)", "Team workspaces", "Version history", "No monthly cost"].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-ink-300">
                    <svg className="h-4 w-4 shrink-0 text-success-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/auth" className="block rounded-xl border border-white/10 bg-white/5 py-3 text-center text-sm font-semibold text-ink-200 transition-colors hover:bg-white/10">
                Get started free
              </Link>
            </div>
          </FadeIn>

          {/* Pro */}
          <FadeIn delay={0.1}>
            <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-accent-500/40 bg-gradient-to-b from-accent-500/12 to-ink-900/60 p-8 shadow-[0_0_40px_rgba(139,92,246,0.1)] backdrop-blur">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent-500/6 to-transparent" />
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="rounded-full bg-accent-500 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white shadow-glow">
                  Most popular
                </span>
              </div>
              <div className="relative mb-6">
                <div className="mb-1 text-xs font-bold uppercase tracking-widest text-accent-400">Pro</div>
                <div className="flex items-end gap-1.5">
                  <span className="text-5xl font-bold text-ink-100">$12</span>
                  <span className="mb-2 text-sm text-ink-500">/ month</span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-ink-400">Everything in Personal plus hosted AI — no API key needed.</p>
              </div>
              <ul className="relative mb-8 flex-1 space-y-3">
                {[
                  "500 Ask queries / month",
                  "200 Knowledge Checks / month",
                  "200 Training Cards / month",
                  "100 Briefings / month",
                  "50 OCR scans / month",
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
              <Link href="/auth" className="relative block rounded-xl bg-accent-500 py-3 text-center text-sm font-semibold text-white shadow-glow transition-colors hover:bg-accent-400">
                Get started
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* CTA */}
      <section className="py-28">
        <FadeIn>
          <div className="relative mx-auto max-w-2xl px-6 text-center">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute left-1/2 top-1/2 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-500/10 blur-[120px]" />
            </div>
            <div className="relative mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-accent-500/35 bg-accent-500/15 shadow-glow">
              <svg width="28" height="28" viewBox="0 0 16 16" fill="none">
                <path d="M3 3h4v10H3zM9 3h4v4H9zM9 9h4v4H9z" fill="currentColor" className="text-accent-400" fillOpacity="0.9" />
              </svg>
            </div>
            <h2 className="relative mb-4 text-4xl font-bold tracking-tight text-ink-100 sm:text-5xl">
              Ready to unlock your<br />knowledge base?
            </h2>
            <p className="relative mb-10 text-lg text-ink-400">
              Free to start. No credit card required.
            </p>
            <Link
              href="/auth"
              className="relative inline-block rounded-xl bg-accent-500 px-10 py-4 text-base font-semibold text-white shadow-glow transition-all hover:-translate-y-px hover:bg-accent-400"
            >
              Create your workspace →
            </Link>
          </div>
        </FadeIn>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent-500">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M3 3h4v10H3zM9 3h4v4H9zM9 9h4v4H9z" fill="white" fillOpacity="0.9" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-ink-300">EternalNotes</span>
          </div>
          <div className="text-xs text-ink-600">© {new Date().getFullYear()} EternalNotes. All rights reserved.</div>
          <Link href="/auth" className="text-sm font-medium text-ink-400 transition-colors hover:text-ink-100">Sign in →</Link>
        </div>
      </footer>
    </div>
  );
}
