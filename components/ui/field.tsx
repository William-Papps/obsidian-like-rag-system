"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Field({
  label,
  hint,
  error,
  className,
  children
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-4">
        <div className="text-[12px] font-medium text-ink-400">{label}</div>
        {hint ? <div className="text-[12px] text-ink-600">{hint}</div> : null}
      </div>
      {children}
      {error ? <div className="text-[12px] text-danger-300">{error}</div> : null}
    </div>
  );
}

