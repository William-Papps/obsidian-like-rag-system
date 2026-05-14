"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const variantClasses: Record<Variant, string> = {
  primary: "border border-electric-blue bg-electric-blue/10 text-white hover:bg-electric-blue/20 disabled:opacity-50",
  secondary: "border border-graphite-rail bg-ink-900/40 text-ink-200 hover:border-ink-600 hover:text-ink-100 disabled:opacity-50",
  ghost: "border border-transparent text-ink-400 hover:bg-graphite-rail/30 hover:text-ink-100 disabled:opacity-40",
  danger: "border border-danger-400/30 bg-danger-400/10 text-danger-400 hover:bg-danger-400/20 disabled:opacity-50"
};

const sizeClasses: Record<Size, string> = {
  sm: "rounded-lg px-3 py-1.5 text-xs",
  md: "rounded-xl px-4 py-2 text-sm"
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

export function Button({ variant = "secondary", size = "md", className = "", children, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 font-medium transition-colors ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {children}
    </button>
  );
}
