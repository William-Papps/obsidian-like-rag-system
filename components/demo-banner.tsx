"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

export function DemoBanner() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((d: { demoMode?: boolean }) => {
        if (d.demoMode) setVisible(true);
      })
      .catch(() => {});
  }, []);

  if (!visible || dismissed) return null;

  return (
    <div className="flex items-center gap-3 bg-amber-500/15 border-b border-amber-500/30 px-4 py-2.5 text-sm text-amber-300">
      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
      <span className="flex-1">
        <strong>Demo mode</strong> — running with example secrets. Your notes are stored locally, but sessions will not survive a restart.{" "}
        <a
          href="https://github.com/William-Papps/obsidian-rag-system/blob/main/README.md#production-setup"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-amber-200"
        >
          Set real secrets before storing important data.
        </a>
      </span>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded p-0.5 hover:bg-amber-500/20"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
