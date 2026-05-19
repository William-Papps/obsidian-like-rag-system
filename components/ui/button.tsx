"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "soft" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "border-accent-400/35 bg-accent-500/15 text-ink-100 hover:bg-accent-500/22 hover:border-accent-400/50",
  secondary:
    "border-ink-750/60 bg-ink-900/40 text-ink-200 hover:bg-ink-875/55 hover:border-ink-700/70",
  soft:
    "border-ink-750/40 bg-ink-900/25 text-ink-300 hover:bg-ink-875/45 hover:text-ink-200",
  ghost:
    "border-transparent bg-transparent text-ink-300 hover:bg-ink-875/40 hover:text-ink-100",
  danger:
    "border-danger-400/30 bg-danger-400/10 text-danger-300 hover:bg-danger-400/18 hover:border-danger-400/45"
};

const sizes: Record<Size, string> = {
  sm: "h-9 rounded-xl px-3 text-xs",
  md: "h-10 rounded-xl px-4 text-sm",
  lg: "h-11 rounded-2xl px-5 text-sm"
};

export function Button({
  variant = "secondary",
  size = "md",
  loading,
  leftIcon,
  rightIcon,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 ease-premium",
        "shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:ring-offset-0",
        "disabled:cursor-not-allowed disabled:opacity-55",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : leftIcon}
      <span className="truncate">{children}</span>
      {rightIcon}
    </button>
  );
}

