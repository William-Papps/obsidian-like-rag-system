import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { getCurrentUserOptional } from "@/lib/auth";
import { Workspace } from "@/components/workspace";
import Link from "next/link";
import { HelpWidget } from "@/components/help-widget";
import { CookieBanner } from "@/components/cookie-banner";
import { Brain, FileText, ShieldCheck, Sparkles, Upload, Users } from "lucide-react";
import { RequestDemoButton } from "@/components/demo-modal";
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
    <section className="relative overflow-hidden bg-black pb-24 pt-[119px]">
      {/* Ambient glow — keeps dark aesthetic without AI-slop gradients */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-accent-500/[0.06] blur-[100px]" />
      <div className="relative mx-auto max-w-[1200px] px-6 text-center">
        {/* Badge */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-[16px] border border-graphite-rail px-4 py-2">
          <Sparkles className="h-3 w-3 text-fog" />
          <span className="text-[14px] text-frost">Now in beta · free to join</span>
        </div>

        {/* Headline — push scale for drama, keep Playfair elegance */}
        <h1 className="mb-6 font-display text-[58px] font-normal leading-[1.05] tracking-[-0.02em] text-white sm:text-[82px]">
          Ask your documents.<br />
          Get answers, not<br className="hidden sm:block" /> search results.
        </h1>

        {/* Sub-copy */}
        <p className="mx-auto mb-10 max-w-xl text-[17px] leading-[1.65] text-fog">
          EternalNotes indexes your team&apos;s documents and answers questions in plain English. Every response cites the exact passage it came from — click any citation to verify.
        </p>

        {/* CTAs */}
        <div className="flex items-center justify-center gap-5">
          <Link
            href="/auth"
            className="rounded-[6px] border border-electric-blue px-6 py-3 text-[14px] font-medium text-white transition-colors hover:bg-electric-blue/10"
          >
            Get started free
          </Link>
          <RequestDemoButton />
        </div>
      </div>
    </section>
  );
}

/* ─── Trust bar ─── */
function TrustBar() {
  const pillars = [
    { label: "Source-cited answers", desc: "Every response links to the exact paragraph it came from" },
    { label: "Zero hallucination", desc: "Answers are grounded in your documents — nothing invented" },
    { label: "Private by default", desc: "Your data is never used to train AI models" },
  ];
  return (
    <section className="border-y border-graphite-rail">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="grid divide-y divide-graphite-rail sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {pillars.map((p) => (
            <div key={p.label} className="px-8 py-6 text-center sm:text-left">
              <div className="text-[13px] font-semibold text-white">{p.label}</div>
              <div className="mt-1 text-[13px] leading-[1.5] text-fog">{p.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── App preview mockup ─── */
function AppPreview() {
  const files = [
    { name: "Q3 Strategy", active: true },
    { name: "Onboarding SOPs", active: false },
    { name: "Product Roadmap", active: false },
    { name: "Market Research", active: false }
  ];
  return (
    <section className="mx-auto max-w-[1200px] px-6 pb-24">
      <div className="overflow-hidden rounded-[16px] border border-graphite-rail select-none">
        {/* Window chrome */}
        <div className="flex items-center gap-2 border-b border-graphite-rail bg-black px-4 py-3">
          <div className="h-3 w-3 rounded-full bg-bounced-red/50" />
          <div className="h-3 w-3 rounded-full bg-complained-yellow/50" />
          <div className="h-3 w-3 rounded-full bg-delivered-green/50" />
          <div className="ml-3 rounded-[4px] bg-graphite-rail px-3 py-0.5 text-[11px] text-steel">eternalnotes.app</div>
        </div>
        {/* Three-pane layout */}
        <div className="grid grid-cols-[190px_1fr_270px] bg-[#0b0e14] min-h-[320px]">
          {/* Sidebar */}
          <div className="border-r border-graphite-rail p-3 space-y-0.5">
            <div className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-wider text-steel">My Vault</div>
            {files.map((f) => (
              <div
                key={f.name}
                className={`flex items-center gap-2 rounded-[6px] px-2 py-1.5 ${f.active ? "bg-white/[0.06] text-frost" : "text-fog"}`}
              >
                <svg className="h-3 w-3 shrink-0 opacity-50" viewBox="0 0 16 16" fill="currentColor"><rect x="2" y="2" width="12" height="12" rx="2" fillOpacity="0.4"/></svg>
                <span className="truncate text-[12px]">{f.name}</span>
              </div>
            ))}
          </div>
          {/* Editor */}
          <div className="border-r border-graphite-rail px-7 py-5 space-y-3">
            <div className="text-[15px] font-semibold text-frost/70">Q3 Strategy</div>
            <div className="space-y-2 text-[12px] leading-relaxed text-fog/60">
              <div>Our primary focus this quarter is expanding into the enterprise segment while maintaining our SMB retention above 94%.</div>
              <div className="h-2.5 w-4/5 rounded-[3px] bg-fog/10" />
              <div className="h-2.5 w-full rounded-[3px] bg-fog/10" />
              <div className="mt-3 h-2.5 w-3/5 rounded-[3px] bg-fog/10" />
            </div>
            <div className="mt-2 space-y-1.5">
              {[1, 0.85].map((w, i) => (
                <div key={i} className="h-2.5 rounded-[3px] bg-fog/8" style={{ width: `${w * 100}%` }} />
              ))}
            </div>
          </div>
          {/* Ask panel */}
          <div className="flex flex-col p-4 space-y-3">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-accent-400/80">
              <svg className="h-3 w-3" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1l1.5 4.5H14l-3.7 2.7 1.4 4.3L8 9.8l-3.7 2.7 1.4-4.3L2 5.5h4.5z"/></svg>
              Ask AI
            </div>
            <div className="rounded-[8px] border border-graphite-rail bg-black/40 px-3 py-2 text-[12px] text-fog/50 italic">
              What is our Q3 enterprise strategy?
            </div>
            <div className="flex-1 rounded-[8px] border border-graphite-rail bg-black/20 p-3 space-y-2">
              <div className="text-[12px] leading-relaxed text-fog/80">
                The Q3 strategy focuses on <span className="text-frost/70">enterprise expansion</span> while keeping SMB retention above 94%.
              </div>
              <div className="flex items-center gap-1.5 rounded-[4px] border border-resend-violet/20 bg-resend-violet/8 px-2 py-1">
                <svg className="h-2.5 w-2.5 shrink-0 text-resend-violet/60" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2h12v2H2zM2 7h8v2H2zM2 12h6v2H2z"/></svg>
                <span className="text-[10px] text-resend-violet/60">Q3 Strategy · paragraph 1</span>
              </div>
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
    description: "Every answer is built directly from your documents — no hallucination, no invented facts. If the answer isn't in your docs, EternalNotes says so."
  },
  {
    icon: <Users className="h-5 w-5" />,
    title: "Team workspaces",
    description: "Create shared workspaces for any team or project. Everyone asks questions from the same indexed knowledge base — no duplicated effort, no version drift."
  },
  {
    icon: <Upload className="h-5 w-5" />,
    title: "Import anything",
    description: "Upload PDFs, paste text, or import Word docs. EternalNotes extracts and indexes everything — your knowledge base is ready to answer questions in minutes."
  },
  {
    icon: <FileText className="h-5 w-5" />,
    title: "Cited responses",
    description: "Every answer includes clickable citations that jump to the exact paragraph in the source document. Verify any answer in one click — no trust required."
  },
  {
    icon: <Brain className="h-5 w-5" />,
    title: "Knowledge checks",
    description: "Turn any document into a Q&A quiz with one click. Validate team understanding of policies, SOPs, and onboarding materials — no question-writing required."
  },
  {
    icon: <ShieldCheck className="h-5 w-5" />,
    title: "Private by default",
    description: "Your documents are never used to train AI models. Queries are processed and discarded immediately. Want full control? Self-host on your own infrastructure."
  }
];

function Features() {
  return (
    <section className="mx-auto max-w-[1200px] px-6 pb-24">
      <div className="mb-12 text-center">
        <h2 className="text-[36px] font-bold leading-[1.1] tracking-[-0.025em] text-white sm:text-[40px]">
          Built for teams who can&apos;t afford wrong answers
        </h2>
        <p className="mt-4 text-[16px] leading-[1.5] text-fog">
          From first upload to cited answer in minutes. No complex setup. No prompt engineering.
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
  { num: "01", title: "Add your documents", body: "Upload PDFs, paste text, or write directly in the editor. Organize by team, project, or topic — however your team already thinks." },
  { num: "02", title: "Index with one click", body: "Hit Reindex and your documents are embedded and ready to answer questions in seconds. We handle all the AI infrastructure." },
  { num: "03", title: "Ask anything", body: "Type a question, get a grounded answer with cited passages. Click any citation to read the exact source paragraph." }
];

function HowItWorks() {
  return (
    <section className="border-t border-graphite-rail py-24">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="mb-12 text-center">
          <h2 className="text-[36px] font-bold leading-[1.1] tracking-[-0.025em] text-white sm:text-[40px]">
            Up and running in minutes
          </h2>
          <p className="mt-4 text-[16px] text-fog">No complex setup. No training data. No prompt engineering. Just your documents.</p>
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
  "400 Ask queries / month",
  "200 Knowledge Checks / month",
  "200 Training Cards / month",
  "200 Briefings / month",
  "50 OCR scans / month",
  "Unlimited notes & documents",
  "Team workspaces"
];

const STARTER_FEATURES = [
  "800 Ask queries / month",
  "350 Knowledge Checks / month",
  "350 Training Cards / month",
  "350 Briefings / month",
  "100 OCR scans / month",
  "Unlimited notes & documents",
  "Team workspaces"
];

const PRO_FEATURES = [
  "2000 Ask queries / month",
  "800 Knowledge Checks / month",
  "800 Training Cards / month",
  "800 Briefings / month",
  "300 OCR scans / month",
  "Unlimited notes & documents",
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
      <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-3">

        {/* Personal */}
        <div className="flex flex-col rounded-[16px] border border-graphite-rail p-8">
          <div className="mb-2 text-[12px] font-medium text-fog">Personal</div>
          <div className="flex items-end gap-1.5">
            <span className="text-[48px] font-bold leading-[1] text-white">$0</span>
            <span className="mb-1 text-[14px] text-fog">/ month</span>
          </div>
          <p className="mt-3 text-[14px] leading-[1.5] text-fog">
            All AI features included. No credit card required.
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

        {/* Starter */}
        <div className="flex flex-col rounded-[16px] border border-graphite-rail p-8">
          <div className="mb-2 text-[12px] font-medium text-fog">Starter</div>
          <div className="flex items-end gap-1.5">
            <span className="text-[48px] font-bold leading-[1] text-white">$6</span>
            <span className="mb-1 text-[14px] text-fog">/ month</span>
          </div>
          <p className="mt-3 text-[14px] leading-[1.5] text-fog">
            Double the monthly limits for growing learners.
          </p>
          <ul className="my-8 flex-1 space-y-3">
            {STARTER_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-[14px] text-frost">
                <CheckIcon color="#a1a4a5" />
                {f}
              </li>
            ))}
          </ul>
          <Link
            href="/auth?next=%2Faccount%3Fsection%3Dbilling"
            className="block rounded-[6px] border border-graphite-rail py-3 text-center text-[14px] font-medium text-frost transition-colors hover:border-smoke"
          >
            Get started →
          </Link>
        </div>

        {/* Pro */}
        <div className="flex flex-col rounded-[16px] border border-electric-blue/30 bg-electric-blue/[0.04] p-8">
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
            Everything in Personal with significantly higher monthly limits.
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
            href="/auth?next=%2Faccount%3Fsection%3Dbilling"
            className="block rounded-[6px] border border-electric-blue py-3 text-center text-[14px] font-medium text-white transition-colors hover:bg-electric-blue/10"
          >
            Get started →
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
        <h2 className="mb-4 font-display text-[48px] font-normal leading-[1.05] tracking-[-0.02em] text-white sm:text-[60px]">
          Your knowledge is<br />
          already written down.
        </h2>
        <p className="mb-10 text-[18px] leading-[1.6] text-fog">
          It&apos;s scattered across PDFs, docs, and notes. EternalNotes indexes it all so your team can ask anything and get a cited answer — instantly.
        </p>
        <Link
          href="/auth"
          className="inline-block rounded-[6px] border border-electric-blue px-8 py-3.5 text-[14px] font-medium text-white transition-colors hover:bg-electric-blue/10"
        >
          Start for free →
        </Link>
        <p className="mt-4 text-[13px] text-steel">No credit card required.</p>
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
      <TrustBar />
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
