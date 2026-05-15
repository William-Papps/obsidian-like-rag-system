"use client";

import { useEffect, useState } from "react";
import { BookOpen, CheckCircle2, Loader2, MessageCircle, XCircle } from "lucide-react";
import Link from "next/link";

type Stage = "loading" | "confirm" | "success" | "error";

export function DiscordVerifyUI({ token, userName }: { token: string; userName: string }) {
  const [stage, setStage] = useState<Stage>("loading");
  const [discordUsername, setDiscordUsername] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/discord/verify?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((body: { discordUsername?: string; error?: string }) => {
        if (body.error) { setErrorMsg(body.error); setStage("error"); return; }
        setDiscordUsername(body.discordUsername ?? "");
        setStage("confirm");
      })
      .catch(() => { setErrorMsg("Something went wrong. Please try again."); setStage("error"); });
  }, [token]);

  async function confirm() {
    setBusy(true);
    try {
      const res = await fetch("/api/discord/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token })
      });
      const body = await res.json() as { success?: boolean; discordUsername?: string; error?: string };
      if (!res.ok) { setErrorMsg(body.error ?? "Verification failed."); setStage("error"); return; }
      setDiscordUsername(body.discordUsername ?? discordUsername);
      setStage("success");
    } catch {
      setErrorMsg("Something went wrong. Please try again.");
      setStage("error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-black px-4 py-10 text-frost">
      <div className="w-full max-w-md rounded-[16px] border border-graphite-rail bg-[#0b0e14] p-8">
        {/* Header */}
        <div className="mb-6 flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ background: "linear-gradient(to right bottom in oklab, rgb(146,129,247) 0%, rgb(154,84,220) 100%)" }}
          >
            <BookOpen className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-[14px] font-medium text-frost">EternalNotes</span>
          <span className="text-steel">×</span>
          <MessageCircle className="h-4 w-4 text-[#5865F2]" />
          <span className="text-[14px] font-medium text-frost">Discord</span>
        </div>

        {stage === "loading" && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-fog" />
            <p className="text-[14px] text-fog">Checking verification link…</p>
          </div>
        )}

        {stage === "confirm" && (
          <>
            <h1 className="mb-2 text-[20px] font-semibold text-white">Link your Discord account</h1>
            <p className="mb-6 text-[14px] leading-[1.5] text-fog">
              You&apos;re about to link your EternalNotes account to Discord. This will grant you the verified role in the server.
            </p>

            <div className="mb-6 space-y-2 rounded-[10px] border border-graphite-rail bg-white/[0.02] p-4">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-steel">EternalNotes account</span>
                <span className="font-medium text-frost">{userName}</span>
              </div>
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-steel">Discord account</span>
                <span className="font-medium text-frost">@{discordUsername}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void confirm()}
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-[6px] border border-[#5865F2]/60 bg-[#5865F2]/10 py-3 text-[14px] font-medium text-white transition-colors hover:bg-[#5865F2]/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
              Confirm and get verified role
            </button>
            <p className="mt-3 text-center text-[12px] text-steel">
              This can be unlinked later from your account settings.
            </p>
          </>
        )}

        {stage === "success" && (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-400" />
            <div>
              <h1 className="text-[20px] font-semibold text-white">You&apos;re verified!</h1>
              <p className="mt-2 text-[14px] leading-[1.5] text-fog">
                <span className="font-medium text-frost">@{discordUsername}</span> is now linked to your EternalNotes account. Your verified role has been assigned in the server.
              </p>
            </div>
            <Link
              href="/"
              className="mt-2 rounded-[6px] border border-graphite-rail px-6 py-2.5 text-[14px] font-medium text-frost transition-colors hover:border-smoke"
            >
              Go to workspace
            </Link>
          </div>
        )}

        {stage === "error" && (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <XCircle className="h-10 w-10 text-red-400" />
            <div>
              <h1 className="text-[20px] font-semibold text-white">Verification failed</h1>
              <p className="mt-2 text-[14px] leading-[1.5] text-fog">{errorMsg}</p>
            </div>
            <Link
              href="/"
              className="mt-2 rounded-[6px] border border-graphite-rail px-6 py-2.5 text-[14px] font-medium text-frost transition-colors hover:border-smoke"
            >
              Go to workspace
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
