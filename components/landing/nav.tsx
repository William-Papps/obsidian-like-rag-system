import Link from "next/link";
import { LogoMark } from "@/components/landing/logo";
import { LandingShell } from "@/components/landing/shell";
import { Button } from "@/components/ui/button";
import { RequestDemoButton } from "@/components/demo-modal";

export function LandingNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-ink-750/50 bg-ink-950/70 backdrop-blur-[18px]">
      <LandingShell className="flex h-[68px] items-center justify-between">
        <Link href="/" className="group inline-flex items-center gap-2.5">
          <LogoMark size={30} />
          <div className="leading-tight">
            <div className="text-[14px] font-semibold text-ink-100">EternalNotes</div>
            <div className="text-[12px] text-ink-500 group-hover:text-ink-400">Private-first research workspace</div>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <RequestDemoButton />
          <Link href="/auth" className="text-[13px] font-medium text-ink-400 hover:text-ink-200 focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] rounded-lg px-2 py-2.5 min-h-[44px] inline-flex items-center">
            Sign in
          </Link>
          <Link href="/auth">
            <Button variant="primary" size="md">
              Get started
            </Button>
          </Link>
        </div>
      </LandingShell>
    </header>
  );
}
