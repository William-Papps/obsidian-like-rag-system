"use client";

import { KeyRound, Loader2, LockKeyhole, Mail, User2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

type Stage = "auth" | "verify" | "forgot" | "reset";

export function AuthForm({ allowSignup }: { allowSignup: boolean }) {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [stage, setStage] = useState<Stage>("auth");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [code, setCode] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [debugCode, setDebugCode] = useState<string | null>(null);
  const [debugResetUrl, setDebugResetUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Handle ?reset=token&email=... from the reset link
  useEffect(() => {
    const token = searchParams.get("reset");
    const emailParam = searchParams.get("email");
    if (token && emailParam) {
      setResetToken(token);
      setPendingEmail(emailParam);
      setStage("reset");
    }
  }, [searchParams]);

  function reset() {
    setError(null);
    setInfo(null);
    setDebugCode(null);
    setDebugResetUrl(null);
  }

  async function submit() {
    setBusy(true);
    reset();
    try {
      const response = await fetch(`/api/auth/${mode === "login" ? "login" : "register"}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({ name, email, password })
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        verificationRequired?: boolean;
        email?: string;
        debugCode?: string | null;
      };
      if (!response.ok) {
        if (response.status === 403 && body.verificationRequired && body.email) {
          setPendingEmail(body.email);
          setDebugCode(body.debugCode ?? null);
          setStage("verify");
          setInfo("Your email is not verified yet. Enter the code we sent to continue.");
          return;
        }
        throw new Error(body.error || "Authentication failed");
      }
      if (body.verificationRequired) {
        setPendingEmail(body.email || email.trim().toLowerCase());
        setDebugCode(body.debugCode ?? null);
        setCode("");
        setStage("verify");
        setInfo("Account created. Enter the verification code we sent to your email.");
        return;
      }
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setBusy(true);
    reset();
    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({ email: pendingEmail, code })
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(body.error || "Verification failed");
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setBusy(true);
    reset();
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({ email: pendingEmail })
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string; debugCode?: string | null };
      if (!response.ok) throw new Error(body.error || "Unable to resend code");
      setDebugCode(body.debugCode ?? null);
      setInfo("A new verification code has been sent.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to resend code");
    } finally {
      setBusy(false);
    }
  }

  async function sendForgotPassword() {
    setBusy(true);
    reset();
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({ email })
      });
      const body = (await response.json().catch(() => ({}))) as { debugUrl?: string | null };
      setDebugResetUrl(body.debugUrl ?? null);
      setInfo("If an account exists for that email, a reset link has been sent.");
    } catch {
      setInfo("If an account exists for that email, a reset link has been sent.");
    } finally {
      setBusy(false);
    }
  }

  async function submitReset() {
    if (newPassword.length < 8) { setError("Password must be at least 8 characters."); return; }
    setBusy(true);
    reset();
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({ email: pendingEmail, token: resetToken, newPassword })
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(body.error || "Password reset failed");
      setStage("auth");
      setMode("login");
      setEmail(pendingEmail);
      setNewPassword("");
      setInfo("Password reset. You can now sign in with your new password.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password reset failed");
    } finally {
      setBusy(false);
    }
  }

  const stageTitle = stage === "verify" ? "Verify email" : stage === "forgot" ? "Forgot password" : stage === "reset" ? "Reset password" : mode === "login" ? "Sign in" : "Create account";
  const stageSubtitle =
    stage === "verify" ? `Enter the verification code for ${pendingEmail || email}.`
    : stage === "forgot" ? "Enter your email and we'll send you a reset link."
    : stage === "reset" ? "Enter your new password below."
    : mode === "login" ? "Sign in to your private study workspace."
    : "Create a local account for this self-hosted EternalNotes instance.";

  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.18),transparent_34%),linear-gradient(180deg,#171221,#0f0d15)] px-4 py-10 text-ink-100">
      <div className="w-full max-w-md rounded-2xl border border-ink-700/80 bg-ink-900/95 p-6 shadow-[0_32px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <div className="mb-6">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-300">EternalNotes</div>
          <h1 className="mt-2 text-2xl font-semibold text-white">{stageTitle}</h1>
          <p className="mt-2 text-sm leading-6 text-ink-400">{stageSubtitle}</p>
        </div>

        {stage === "auth" ? (
          <div className="mb-4 flex gap-2 rounded-xl border border-ink-700/80 bg-ink-950/60 p-1">
            <TabBtn active={mode === "login"} onClick={() => { setMode("login"); reset(); }}>Sign in</TabBtn>
            {allowSignup ? <TabBtn active={mode === "signup"} onClick={() => { setMode("signup"); reset(); }}>Create account</TabBtn> : null}
          </div>
        ) : null}

        {stage === "auth" ? (
          <>
            <div className="space-y-3">
              {mode === "signup" ? (
                <Field icon={<User2 className="h-4 w-4" />} label="Name">
                  <input value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-transparent text-sm text-white outline-none placeholder:text-ink-500" placeholder="Your name" />
                </Field>
              ) : null}
              <Field icon={<Mail className="h-4 w-4" />} label="Email">
                <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-transparent text-sm text-white outline-none placeholder:text-ink-500" placeholder="you@example.com" autoComplete="email" type="email" />
              </Field>
              <Field icon={<LockKeyhole className="h-4 w-4" />} label="Password">
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-transparent text-sm text-white outline-none placeholder:text-ink-500" placeholder="At least 8 characters" autoComplete={mode === "login" ? "current-password" : "new-password"} onKeyDown={(e) => e.key === "Enter" && void submit()} />
              </Field>
            </div>
            {info ? <InfoBanner>{info}</InfoBanner> : null}
            {error ? <ErrorBanner>{error}</ErrorBanner> : null}
            <button type="button" onClick={() => void submit()} disabled={busy || !email.trim() || password.trim().length < 8 || (mode === "signup" && !name.trim())} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-accent-500 px-4 py-3 text-sm font-semibold text-ink-950 hover:bg-accent-400 disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {mode === "login" ? "Sign in" : "Create account"}
            </button>
            {mode === "login" ? (
              <button type="button" onClick={() => { reset(); setStage("forgot"); }} className="mt-3 block w-full text-center text-sm text-accent-300 hover:text-accent-200">
                Forgot password?
              </button>
            ) : null}
            {!allowSignup ? <div className="mt-4 text-xs leading-5 text-ink-500">Registration is disabled on this instance. Use an existing account.</div> : null}
          </>
        ) : stage === "verify" ? (
          <>
            <div className="space-y-3">
              <Field icon={<Mail className="h-4 w-4" />} label="Email">
                <input value={pendingEmail} readOnly className="w-full bg-transparent text-sm text-ink-300 outline-none" />
              </Field>
              <Field icon={<KeyRound className="h-4 w-4" />} label="Verification code">
                <input value={code} onChange={(e) => setCode(e.target.value)} className="w-full bg-transparent text-sm text-white outline-none placeholder:text-ink-500" placeholder="6-digit code" inputMode="numeric" autoComplete="one-time-code" onKeyDown={(e) => e.key === "Enter" && void verify()} />
              </Field>
            </div>
            {debugCode ? <div className="mt-4 rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-sm text-amber-300">Dev mode — your code is <span className="font-semibold">{debugCode}</span></div> : null}
            {info ? <InfoBanner>{info}</InfoBanner> : null}
            {error ? <ErrorBanner>{error}</ErrorBanner> : null}
            <button type="button" onClick={() => void verify()} disabled={busy || code.trim().length < 4} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-accent-500 px-4 py-3 text-sm font-semibold text-ink-950 hover:bg-accent-400 disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Verify email
            </button>
            <div className="mt-3 flex items-center justify-between gap-3">
              <button type="button" onClick={() => void resend()} disabled={busy} className="text-sm font-medium text-accent-300 hover:text-accent-200 disabled:opacity-60">Resend code</button>
              <button type="button" onClick={() => { setStage("auth"); setCode(""); reset(); }} disabled={busy} className="text-sm font-medium text-ink-500 hover:text-ink-300 disabled:opacity-60">Back</button>
            </div>
          </>
        ) : stage === "forgot" ? (
          <>
            <div className="space-y-3">
              <Field icon={<Mail className="h-4 w-4" />} label="Email">
                <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-transparent text-sm text-white outline-none placeholder:text-ink-500" placeholder="you@example.com" type="email" autoComplete="email" onKeyDown={(e) => e.key === "Enter" && void sendForgotPassword()} />
              </Field>
            </div>
            {debugResetUrl ? (
              <div className="mt-4 rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-sm text-amber-300 break-all">
                Dev mode — <a href={debugResetUrl} className="underline">{debugResetUrl}</a>
              </div>
            ) : null}
            {info ? <InfoBanner>{info}</InfoBanner> : null}
            {error ? <ErrorBanner>{error}</ErrorBanner> : null}
            <button type="button" onClick={() => void sendForgotPassword()} disabled={busy || !email.trim()} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-accent-500 px-4 py-3 text-sm font-semibold text-ink-950 hover:bg-accent-400 disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Send reset link
            </button>
            <button type="button" onClick={() => { setStage("auth"); reset(); }} className="mt-3 block w-full text-center text-sm text-ink-500 hover:text-ink-300">Back to sign in</button>
          </>
        ) : (
          <>
            <div className="space-y-3">
              <Field icon={<LockKeyhole className="h-4 w-4" />} label="New password">
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-transparent text-sm text-white outline-none placeholder:text-ink-500" placeholder="At least 8 characters" autoComplete="new-password" onKeyDown={(e) => e.key === "Enter" && void submitReset()} />
              </Field>
            </div>
            {info ? <InfoBanner>{info}</InfoBanner> : null}
            {error ? <ErrorBanner>{error}</ErrorBanner> : null}
            <button type="button" onClick={() => void submitReset()} disabled={busy || newPassword.length < 8} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-accent-500 px-4 py-3 text-sm font-semibold text-ink-950 hover:bg-accent-400 disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Set new password
            </button>
          </>
        )}
      </div>
    </main>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${active ? "bg-accent-500 text-ink-950" : "text-ink-400 hover:text-white"}`}>
      {children}
    </button>
  );
}

function Field({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">{label}</div>
      <div className="flex items-center gap-2 rounded-xl border border-ink-700/80 bg-ink-950/60 px-3 py-3 text-ink-400">{icon}{children}</div>
    </label>
  );
}

function InfoBanner({ children }: { children: ReactNode }) {
  return <div className="mt-4 rounded-xl border border-accent-500/25 bg-accent-500/10 px-3 py-2 text-sm text-accent-200">{children}</div>;
}

function ErrorBanner({ children }: { children: ReactNode }) {
  return <div className="mt-4 rounded-xl border border-danger-400/30 bg-danger-400/10 px-3 py-2 text-sm text-danger-400">{children}</div>;
}
