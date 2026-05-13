"use client";

import { useEffect, useState } from "react";
import { MarkdownPreview } from "@/components/markdown";

export default function PublicSharePage({ params }: { params: Promise<{ token: string }> }) {
  const [note, setNote] = useState<{ title: string; markdownContent: string; updatedAt: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

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
        <h1 className="text-2xl font-bold text-ink-100">{note.title}</h1>
        <p className="mt-1 text-xs text-ink-500">
          Last updated {new Date(note.updatedAt).toLocaleDateString()}
        </p>
      </header>
      <div className="mx-auto max-w-3xl">
        <MarkdownPreview markdown={note.markdownContent} />
      </div>
    </div>
  );
}
