import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { getCurrentUserOptional } from "@/lib/auth";
import { Workspace } from "@/components/workspace";
import Link from "next/link";
import { HelpWidget } from "@/components/help-widget";
import { CookieBanner } from "@/components/cookie-banner";
import { Brain, FileText, ShieldCheck, Sparkles, Upload, Users } from "lucide-react";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RootPage() {
  noStore();
  const user = await getCurrentUserOptional();
  if (user) return <Workspace />;
  return <LandingPage />;
}

/* ─── Logo mark ─── */
function Logo({ size = 28 }: { size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-lg"
      style={{
        width: size,
        height: size,
        background: "linear-gradient(to right bottom in oklab, rgb(146,129,247) 0%, rgb(154,84,220) 100%)"
      }}
    >
      <svg width={Math.round(size * 0.5)} height={Math.round(size * 0.5)} viewBox="0 0 16 16" fill="none">
        <path d="M3 3h4v10H3zM9 3h4v4H9zM9 9h4v4H9z" fill="white" fillOpacity="0.9" />
      </svg>
    </div>
  );
}

/* ─── Nav ─── */
function Nav() {
  return (
    <nav className="fixed inset-x-0 top-0 z-50 h-[59px] border-b border-graphite-rail bg-black/90 backdrop-blur-[25px]">
      <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between px-6">
        <div className="flex items-center gap-2.5">
          <Logo size={28} />
          <span className="text-[15px] font-semibold text-white">EternalNotes</span>
        </div>
        <div className="flex items-center gap-5">
          <Link
            href="/auth"
            className="text-[14px] font-normal text-white/60 transition-colors hover:text-white"
          >
            Sign in
          </Link>
          <Link
            href="/auth"
            className="rounded-[6px] border border-electric-blue px-4 py-[7px] text-[14px] font-medium text-white transition-colors hover:bg-electric-blue/10"
          >
            Get started
          </Link>
        </div>
      </div>
    </nav>
  );
}

/* ─── Hero ─── */
function Hero() {
  return (
    <section className="bg-black pb-24 pt-[119px]">
      <div className="mx-auto max-w-[1200px] px-6 text-center">
        {/* Announcement badge */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-[16px] border border-graphite-rail px-4 py-2">
          <Sparkles className="h-3 w-3 text-fog" />
          <span className="text-[14px] text-frost">Now in beta</span>
          <span className="text-fog">→</span>
        </div>

        {/* Display headline — Playfair Display */}
        <h1 className="mb-6 font-display text-[56px] font-normal leading-[1] tracking-[-0.01em] text-white sm:text-[72px]">
          Your team&apos;s knowledge,<br />
          instantly queryable.
        </h1>

        {/* Sub-copy */}
        <p className="mx-auto mb-10 max-w-lg text-[18px] leading-[1.6] text-fog">
          Add documents, index once, ask in plain English. Every answer cites the exact source — no hallucinations, ever.
        </p>

        {/* CTAs */}
        <div className="flex items-center justify-center gap-5">
          <Link
            href="/auth"
            className="rounded-[6px] border border-electric-blue px-6 py-3 text-[14px] font-medium text-white transition-colors hover:bg-electric-blue/10"
          >
            Get started free
          </Link>
          <Link
            href="/auth"
            className="text-[14px] font-normal text-white/60 transition-colors hover:text-white"
          >
            Sign in →
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─── App preview mockup ─── */
function AppPreview() {
  const files = ["Q3 Strategy", "Onboarding SOPs", "Product Roadmap", "Market Research"];
  return (
    <section className="mx-auto max-w-[1200px] px-6 pb-24">
      <div className="overflow-hidden rounded-[16px] border border-graphite-rail">
        {/* Window chrome */}
        <div className="flex items-center gap-2 border-b border-graphite-rail bg-black px-4 py-3">
          <div className="h-3 w-3 rounded-full bg-bounced-red/50" />
          <div className="h-3 w-3 rounded-full bg-complained-yellow/50" />
          <div className="h-3 w-3 rounded-full bg-delivered-green/50" />
          <div className="ml-3 h-4 w-48 rounded-[4px] bg-graphite-rail" />
        </div>
        {/* Three-pane layout */}
        <div className="grid grid-cols-[180px_1fr_260px] bg-black">
          {/* Sidebar */}
          <div className="border-r border-graphite-rail p-4 space-y-1">
            {files.map((name, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 rounded-[6px] px-2 py-1.5 ${i === 0 ? "bg-white/[0.05]" : ""}`}
              >
                <div className="h-3 w-3 shrink-0 rounded-[3px] border border-graphite-rail" />
                <div
                  className={`h-2.5 rounded-[3px] ${i === 0 ? "bg-frost/50" : "bg-fog/20"}`}
                  style={{ width: `${48 + i * 14}px` }}
                />
              </div>
            ))}
          </div>
          {/* Editor */}
          <div className="p-6 space-y-3">
            <div className="h-4 w-44 rounded-[3px] bg-frost/[0.08]" />
            <div className="space-y-1.5">
              {[1, 0.8, 1].map((w, i) => (
                <div key={i} className="h-2.5 rounded-[3px] bg-fog/[0.12]" style={{ width: `${w * 100}%` }} />
              ))}
            </div>
            <div className="mt-4 space-y-1.5">
              {[0.6, 1, 0.75].map((w, i) => (
                <div key={i} className="h-2.5 rounded-[3px] bg-fog/[0.12]" style={{ width: `${w * 100}%` }} />
              ))}
            </div>
          </div>
          {/* Ask panel */}
          <div className="border-l border-graphite-rail p-4 space-y-3">
            <div className="rounded-[6px] border border-graphite-rail p-3">
              <div className="mb-2 text-[11px] font-medium text-fog">Ask</div>
              <div className="h-7 w-full rounded-[4px] border border-graphite-rail" />
            </div>
            <div className="rounded-[6px] border border-graphite-rail p-3 space-y-1.5">
              {[1, 0.8, 1].map((w, i) => (
                <div key={i} className="h-2 rounded-[3px] bg-fog/[0.12]" style={{ width: `${w * 100}%` }} />
              ))}
              <div className="mt-2 h-2 w-2/3 rounded-[3px] bg-resend-violet/30" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Features ─── */
const FEATURES: Array<{ icon: ReactNode; title: string; description: string }> = [
  {
    icon: <Sparkles className="h-5 w-5" />,
    title: "Grounded AI answers",
    description: "Ask anything in plain English. Every answer is backed by exact quotes from your documents — no hallucinations, ever."
  },
  {
    icon: <Users className="h-5 w-5" />,
    title: "Team workspaces",
    description: "Invite colleagues into shared workspaces. Everyone queries the same documents, from anywhere."
  },
  {
    icon: <Upload className="h-5 w-5" />,
    title: "Import anything",
    description: "Paste text, upload PDFs, Word docs, and more. EternalNotes extracts and indexes everything for grounded Q&A."
  },
  {
    icon: <FileText className="h-5 w-5" />,
    title: "Cited responses",
    description: "Every answer links back to the exact source document and excerpt. Click to jump straight to it."
  },
  {
    icon: <Brain className="h-5 w-5" />,
    title: "Knowledge checks",
    description: "Generate Q&A quizzes from your documents to validate team understanding of SOPs and policies."
  },
  {
    icon: <ShieldCheck className="h-5 w-5" />,
    title: "Private by default",
    description: "Your documents never leave your infrastructure. Self-hosted, fully under your control."
  }
];

function Features() {
  return (
    <section className="mx-auto max-w-[1200px] px-6 pb-24">
      <div className="mb-12 text-center">
        <h2 className="text-[36px] font-bold leading-[1.1] tracking-[-0.025em] text-white sm:text-[40px]">
          Everything your team needs
        </h2>
        <p className="mt-4 text-[16px] leading-[1.5] text-fog">
          Built for teams that run on documents and can&apos;t afford wrong answers.
        </p>
      </div>
      {/* Grid with graphite hairline dividers via gap-px technique */}
      <div className="overflow-hidden rounded-[16px] border border-graphite-rail bg-graphite-rail">
        <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div key={i} className="bg-black p-8">
              <div className="mb-4 text-white">{f.icon}</div>
              <h3 className="mb-2 text-[16px] font-semibold leading-[1.33] text-white">{f.title}</h3>
              <p className="text-[14px] leading-[1.5] text-fog">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── How it works ─── */
const STEPS = [
  { num: "01", title: "Add your documents", body: "Upload PDFs, paste text, or write directly in the editor. Organize by project or team." },
  { num: "02", title: "Index with one click", body: "Hit Reindex and your content is embedded and ready to query in seconds." },
  { num: "03", title: "Ask anything",          body: "Type a question. Get a grounded answer with citations you can click through to verify." }
];

function HowItWorks() {
  return (
    <section className="border-t border-graphite-rail py-24">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="mb-12 text-center">
          <h2 className="text-[36px] font-bold leading-[1.1] tracking-[-0.025em] text-white sm:text-[40px]">
            Up and running in minutes
          </h2>
          <p className="mt-4 text-[16px] text-fog">No complex setup. No training data. Just your documents.</p>
        </div>
        <div className="grid gap-10 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={i} className="border-t border-graphite-rail pt-6">
              <div className="mb-4 text-[12px] font-semibold tracking-[0.1em] text-fog">{s.num}</div>
              <h3 className="mb-2 text-[18px] font-semibold text-white">{s.title}</h3>
              <p className="text-[14px] leading-[1.6] text-fog">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Pricing ─── */
const PERSONAL_FEATURES = [
  "Unlimited documents",
  "All AI tools (BYOK)",
  "Team workspaces",
  "Version history",
  "No monthly cost"
];

const PRO_FEATURES = [
  "1500 Ask queries / month",
  "600 Knowledge Checks / month",
  "600 Training Cards / month",
  "600 Briefings / month",
  "200 OCR scans / month",
  "Team workspaces"
];

function CheckIcon({ color }: { color: string }) {
  return (
    <svg className="h-4 w-4 shrink-0" style={{ color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function Pricing() {
  return (
    <section className="mx-auto max-w-[1200px] px-6 py-24">
      <div className="mb-12 text-center">
        <h2 className="text-[36px] font-bold leading-[1.1] tracking-[-0.025em] text-white sm:text-[40px]">
          Simple pricing
        </h2>
        <p className="mt-4 text-[16px] text-fog">Start free. Upgrade when your team grows.</p>
      </div>
      <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2">

        {/* Personal */}
        <div className="flex flex-col rounded-[16px] border border-graphite-rail p-8">
          <div className="mb-2 text-[12px] font-medium text-fog">Personal</div>
          <div className="flex items-end gap-1.5">
            <span className="text-[48px] font-bold leading-[1] text-white">$0</span>
            <span className="mb-1 text-[14px] text-fog">/ month</span>
          </div>
          <p className="mt-3 text-[14px] leading-[1.5] text-fog">
            Full access to all features. Bring your own OpenAI API key.
          </p>
          <ul className="my-8 flex-1 space-y-3">
            {PERSONAL_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-[14px] text-frost">
                <CheckIcon color="#a1a4a5" />
                {f}
              </li>
            ))}
          </ul>
          <Link
            href="/auth"
            className="block rounded-[6px] border border-graphite-rail py-3 text-center text-[14px] font-medium text-frost transition-colors hover:border-smoke"
          >
            Get started free
          </Link>
        </div>

        {/* Pro */}
        <div className="flex flex-col rounded-[16px] border border-graphite-rail p-8">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[12px] font-medium text-fog">Pro</div>
            <span className="rounded-[6px] border border-electric-blue/30 px-2 py-0.5 text-[11px] font-medium text-electric-blue">
              Popular
            </span>
          </div>
          <div className="flex items-end gap-1.5">
            <span className="text-[48px] font-bold leading-[1] text-white">$12</span>
            <span className="mb-1 text-[14px] text-fog">/ month</span>
          </div>
          <p className="mt-3 text-[14px] leading-[1.5] text-fog">
            Everything in Personal plus hosted AI — no API key needed.
          </p>
          <ul className="my-8 flex-1 space-y-3">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-[14px] text-frost">
                <CheckIcon color="#3b9eff" />
                {f}
              </li>
            ))}
          </ul>
          <Link
            href="/auth"
            className="block rounded-[6px] border border-electric-blue py-3 text-center text-[14px] font-medium text-white transition-colors hover:bg-electric-blue/10"
          >
            Get started
          </Link>
        </div>

      </div>
    </section>
  );
}

/* ─── CTA ─── */
function CtaSection() {
  return (
    <section className="border-t border-graphite-rail py-24">
      <div className="mx-auto max-w-[800px] px-6 text-center">
        <h2 className="mb-4 font-display text-[48px] font-normal leading-[1] tracking-[-0.01em] text-white sm:text-[56px]">
          Ready to unlock your<br />
          knowledge base?
        </h2>
        <p className="mb-10 text-[18px] leading-[1.6] text-fog">
          Free to start. No credit card required.
        </p>
        <Link
          href="/auth"
          className="inline-block rounded-[6px] border border-electric-blue px-8 py-3.5 text-[14px] font-medium text-white transition-colors hover:bg-electric-blue/10"
        >
          Create your workspace →
        </Link>
      </div>
    </section>
  );
}

/* ─── Footer ─── */
const LEGAL_LINKS = [
  { href: "/legal/terms",          label: "Terms" },
  { href: "/legal/privacy",        label: "Privacy" },
  { href: "/legal/cookies",        label: "Cookies" },
  { href: "/legal/acceptable-use", label: "Acceptable Use" },
  { href: "/legal/ai",             label: "AI Disclaimer" },
  { href: "/legal/refunds",        label: "Refunds" },
  { href: "/legal/contact",        label: "Contact" }
];

function Footer() {
  return (
    <footer className="border-t border-graphite-rail py-10">
      <div className="mx-auto max-w-[1200px] px-6 space-y-6">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <Logo size={22} />
            <span className="text-[14px] font-medium text-frost">EternalNotes</span>
          </div>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
            {LEGAL_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-[12px] text-steel transition-colors hover:text-fog"
              >
                {l.label}
              </Link>
            ))}
          </div>
          <div className="text-[12px] text-steel">
            © {new Date().getFullYear()} EternalNotes
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ─── Landing page ─── */
function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-frost">
      <Nav />
      <Hero />
      <AppPreview />
      <Features />
      <HowItWorks />
      <Pricing />
      <CtaSection />
      <HelpWidget />
      <CookieBanner />
      <Footer />
    </div>
  );
}
