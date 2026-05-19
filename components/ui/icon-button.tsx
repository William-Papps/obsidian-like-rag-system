"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function IconButton({
  label,
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return (
    <button
      {...props}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-ink-750/50 bg-ink-900/30 text-ink-300 transition-all duration-200 ease-premium",
        "hover:border-ink-700/70 hover:bg-ink-875/45 hover:text-ink-100 focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] disabled:opacity-50",
        className
      )}
    >
      {children}
    </button>
  );
}

