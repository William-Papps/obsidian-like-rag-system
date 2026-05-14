"use client";

import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { MarkdownPreview } from "@/components/markdown";

export default function PublicSharePage({ params }: { params: Promise<{ token: string }> }) {
  const [note, setNote] = useState<{ title: string; markdownContent: string; updatedAt: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [importState, setImportState] = useState<"idle" | "loading" | "done" | "needsAuth">("idle");

  useEffect(() => {
    params.then((p) => setToken(p.token));
  }, [params]);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/public/${token}`)
      .then(async (r) => {
        if (!r.ok) { setError("This note is not available or the link has expired."); return; }
        setNote(await r.json());
      })
      .catch(() => setError("Failed to load note."));
  }, [token]);

  async function handleImport() {
    if (!token) return;
    setImportState("loading");
    const res = await fetch(`/api/public/${token}/import`, { method: "POST" });
    if (res.status === 401) { setImportState("needsAuth"); return; }
    if (res.ok) { setImportState("done"); return; }
    setImportState("idle");
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950 text-ink-400">
        <div className="text-center">
          <div className="mb-2 text-4xl">🔒</div>
          <div className="text-lg font-semibold text-ink-200">Not available</div>
          <div className="mt-1 text-sm">{error}</div>
        </div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950 text-ink-500 text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-950 text-ink-100">
      <header className="border-b border-graphite-rail px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-ink-100">{note.title}</h1>
            <p className="mt-1 text-xs text-ink-500">
              Last updated {new Date(note.updatedAt).toLocaleDateString()}
            </p>
          </div>
          <div className="shrink-0 pt-1">
            {importState === "done" ? (
              <a
                href="/"
                className="flex items-center gap-1.5 rounded-[6px] border border-electric-blue px-3 py-1.5 text-xs font-semibold text-white hover:bg-electric-blue/10 transition-colors"
              >
                Imported — open workspace
              </a>
            ) : importState === "needsAuth" ? (
              <a
                href={`/auth?next=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "")}`}
                className="flex items-center gap-1.5 rounded-[6px] border border-graphite-rail px-3 py-1.5 text-xs font-medium text-ink-300 hover:bg-graphite-rail/30 transition-colors"
              >
                Sign in to import
              </a>
            ) : (
              <button
                onClick={() => void handleImport()}
                disabled={importState === "loading"}
                className="flex items-center gap-1.5 rounded-[6px] border border-electric-blue px-3 py-1.5 text-xs font-semibold text-white hover:bg-electric-blue/10 transition-colors disabled:opacity-60"
              >
                {importState === "loading" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Download className="h-3 w-3" />
                )}
                {importState === "loading" ? "Importing…" : "Import to my workspace"}
              </button>
            )}
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-3xl">
        <MarkdownPreview markdown={note.markdownContent} />
      </div>
    </div>
  );
}
