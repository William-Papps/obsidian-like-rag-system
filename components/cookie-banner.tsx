"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem("cookieBannerDismissed")) setVisible(true);
    } catch { /* storage unavailable */ }
  }, []);

  function dismiss() {
    try { localStorage.setItem("cookieBannerDismissed", "1"); } catch { /* ignore */ }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-graphite-rail bg-black/95 px-4 py-3 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
        <p className="text-xs text-ink-400">
          We use one session cookie to keep you logged in — no tracking or advertising.{" "}
          <Link href="/legal/cookies" className="underline underline-offset-2 hover:text-ink-200 transition-colors">
            Cookie policy
          </Link>
        </p>
        <button
          onClick={dismiss}
          className="shrink-0 rounded-lg border border-graphite-rail px-3 py-1.5 text-xs font-medium text-ink-300 hover:bg-graphite-rail/40 transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
