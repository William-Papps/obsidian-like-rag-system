"use client";

import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-11 w-full rounded-xl border border-ink-750/60 bg-ink-950/40 px-3.5 text-sm text-ink-100 placeholder:text-ink-600 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] outline-none transition",
        "hover:border-ink-700/70 focus:border-accent-400/45 focus:ring-2 focus:ring-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    />
  );
}

