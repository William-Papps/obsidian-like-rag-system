"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Users, CheckCircle, XCircle } from "lucide-react";

export default function WorkspaceJoinPage() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Invalid invite link.");
      return;
    }
    void (async () => {
      try {
        const response = await fetch("/api/workspaces/join", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token })
        });
        const body = await response.json();
        if (!response.ok) {
          if (response.status === 401) {
            window.location.href = `/auth?next=${encodeURIComponent(window.location.href)}`;
            return;
          }
          setStatus("error");
          setMessage(body.error || "Failed to join workspace.");
        } else {
          setStatus("success");
          setWorkspaceName(body.workspaceName);
        }
      } catch {
        setStatus("error");
        setMessage("Something went wrong.");
      }
    })();
  }, [token]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink-950 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-ink-700 bg-ink-900 p-8 shadow-panel text-center">
        {status === "loading" ? (
          <>
            <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-accent-400" />
            <div className="text-ink-300">Joining workspace…</div>
          </>
        ) : status === "success" ? (
          <>
            <CheckCircle className="mx-auto mb-4 h-8 w-8 text-emerald-400" />
            <div className="mb-1 text-lg font-semibold text-ink-100">You joined {workspaceName}</div>
            <div className="mb-6 text-sm text-ink-500">You now have access to all shared documents.</div>
            <a
              href="/"
              className="inline-block rounded-lg bg-accent-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-400"
            >
              Open workspace
            </a>
          </>
        ) : (
          <>
            <XCircle className="mx-auto mb-4 h-8 w-8 text-danger-400" />
            <div className="mb-1 text-lg font-semibold text-ink-100">Invite invalid</div>
            <div className="mb-6 text-sm text-ink-500">{message}</div>
            <a href="/" className="text-sm font-medium text-accent-300 hover:text-accent-200">Go home</a>
          </>
        )}
      </div>
    </main>
  );
}
