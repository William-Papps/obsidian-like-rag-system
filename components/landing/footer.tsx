import Link from "next/link";
import { LandingShell } from "@/components/landing/shell";
import { LogoMark } from "@/components/landing/logo";

const LEGAL_LINKS = [
  { href: "/legal/terms", label: "Terms" },
  { href: "/legal/privacy", label: "Privacy" },
  { href: "/legal/cookies", label: "Cookies" },
  { href: "/legal/acceptable-use", label: "Acceptable Use" },
  { href: "/legal/ai", label: "AI Disclaimer" },
  { href: "/legal/refunds", label: "Refunds" },
  { href: "/legal/contact", label: "Contact" }
];

export function LandingFooter() {
  return (
    <footer className="border-t border-ink-750/40 py-10">
      <LandingShell className="flex flex-col items-center justify-between gap-6 sm:flex-row">
        <div className="flex items-center gap-2.5">
          <LogoMark size={24} />
          <div className="leading-tight">
            <div className="text-[13px] font-semibold text-ink-100">EternalNotes</div>
            <div className="text-[12px] text-ink-600">Private-first research workspace</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {LEGAL_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-1.5 py-1 text-[12px] text-ink-600 hover:text-ink-300 focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="text-[12px] text-ink-600">© {new Date().getFullYear()} EternalNotes</div>
      </LandingShell>
    </footer>
  );
}

