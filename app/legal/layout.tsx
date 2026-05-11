import type { ReactNode } from "react";
import Link from "next/link";

const links = [
  { href: "/legal/terms", label: "Terms of Service" },
  { href: "/legal/privacy", label: "Privacy Policy" },
  { href: "/legal/cookies", label: "Cookie Policy" },
  { href: "/legal/refunds", label: "Refunds" },
  { href: "/legal/acceptable-use", label: "Acceptable Use" },
  { href: "/legal/ai", label: "AI Disclaimer" },
  { href: "/legal/contact", label: "Contact" },
];

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-ink-950 text-ink-100">
      <header className="border-b border-white/[0.06] bg-ink-950/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent-500">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M3 3h4v10H3zM9 3h4v4H9zM9 9h4v4H9z" fill="white" fillOpacity="0.9" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-ink-200">EternalNotes</span>
          </Link>
          <Link href="/" className="text-sm text-ink-400 hover:text-ink-100">← Back to home</Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="flex flex-col gap-10 lg:flex-row lg:gap-16">
          <nav className="shrink-0 lg:w-44">
            <div className="text-xs font-semibold uppercase tracking-widest text-ink-500 mb-3">Legal</div>
            <ul className="space-y-1">
              {links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="block rounded-lg px-3 py-1.5 text-sm text-ink-400 transition-colors hover:bg-ink-800/60 hover:text-ink-100"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <main className="min-w-0 flex-1">
            {children}
          </main>
        </div>
      </div>

      <footer className="border-t border-white/[0.06] py-8 mt-16">
        <div className="mx-auto max-w-5xl px-6 text-center text-xs text-ink-600">
          © {new Date().getFullYear()} EternalNotes. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
