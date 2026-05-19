"use client";

import { createContext, type ReactNode, useContext, useId, useMemo } from "react";
import { cn } from "@/lib/cn";

type TabsContextValue = {
  value: string;
  setValue: (v: string) => void;
  baseId: string;
};

const TabsContext = createContext<TabsContextValue | null>(null);

export function Tabs({
  value,
  onValueChange,
  children
}: {
  value: string;
  onValueChange: (v: string) => void;
  children: ReactNode;
}) {
  const baseId = useId();
  const ctx = useMemo(() => ({ value, setValue: onValueChange, baseId }), [value, onValueChange, baseId]);
  return <TabsContext.Provider value={ctx}>{children}</TabsContext.Provider>;
}

export function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        "inline-flex rounded-2xl border border-ink-750/60 bg-ink-900/40 p-1",
        className
      )}
    />
  );
}

export function TabsTrigger({
  value,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("TabsTrigger must be used within Tabs");
  const active = ctx.value === value;
  const id = `${ctx.baseId}-tab-${value}`;
  const panelId = `${ctx.baseId}-panel-${value}`;
  return (
    <button
      {...props}
      id={id}
      role="tab"
      aria-selected={active}
      aria-controls={panelId}
      type="button"
      onClick={() => ctx.setValue(value)}
      className={cn(
        "px-3 py-2 text-[13px] font-semibold transition-all duration-200 ease-premium focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]",
        active ? "rounded-xl bg-ink-875/70 text-ink-100" : "text-ink-400 hover:text-ink-200",
        className
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, className, children }: { value: string; className?: string; children: ReactNode }) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("TabsContent must be used within Tabs");
  if (ctx.value !== value) return null;
  const panelId = `${ctx.baseId}-panel-${value}`;
  const tabId = `${ctx.baseId}-tab-${value}`;
  return (
    <div role="tabpanel" id={panelId} aria-labelledby={tabId} className={cn("mt-4", className)}>
      {children}
    </div>
  );
}

