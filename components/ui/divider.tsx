"use client";

import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Divider({ className, ...props }: HTMLAttributes<HTMLHRElement>) {
  return <hr {...props} className={cn("border-0 border-t border-ink-750/50", className)} />;
}

