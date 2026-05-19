"use client";

import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "neutral" | "accent" | "success" | "warning" | "danger";

const styles: Record<Variant, string> = {
  neutral: "border-ink-750/60 bg-ink-900/40 text-ink-300",
  accent: "border-accent-400/25 bg-accent-500/10 text-accent-300",
  success: "border-success-400/25 bg-success-400/10 text-success-300",
  warning: "border-amber-400/25 bg-amber-400/10 text-amber-300",
  danger: "border-danger-400/25 bg-danger-400/10 text-danger-300"
};

export function Badge({
  variant = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      {...props}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none",
        styles[variant],
        className
      )}
    />
  );
}

