"use client";

import { BookOpen, KeyRound, Loader2, LockKeyhole, Mail, User2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id: string) => void;
      remove: (id: string) => void;
    };
  }
}

type Stage = "auth" | "verify" | "forgot" | "reset";

export function AuthForm({ allowSignup }: { allowSignup: boolean }) {
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") || "/";
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [stage, setStage] = useState<Stage>("auth");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [code, setCode] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [retryAfter, setRetryAfter] = useState(0);
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetId = useRef<string | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (retryAfter <= 0) return;
    const id = setTimeout(() => setRetryAfter((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(id);
  }, [retryAfter]);

  // Load Turnstile script once
  useEffect(() => {
    if (!siteKey) return;
    if (document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]')) return;
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v1/api.js?render=explicit";
    s.async = true;
    document.head.appendChild(s);
  }, [siteKey]);

  // Render widget when signup form is visible, clean up when leaving
  useEffect(() => {
    if (!siteKey || stage !== "auth" || mode !== "signup" || !turnstileRef.current) return;
    const container = turnstileRef.current;
    let widgetId: string | null = null;
    const interval = setInterval(() => {
      if (!window.turnstile || !container) return;
      clearInterval(interval);
      widgetId = window.turnstile.render(container, {
        sitekey: siteKey,
        callback: (token: string) => setTurnstileToken(token),
        "expired-callback": () => setTurnstileToken(""),
        "error-callback": () => setTurnstileToken(""),
        theme: "dark",
      });
      turnstileWidgetId.current = widgetId;
    }, 100);
    return () => {
      clearInterval(interval);
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
      turnstileWidgetId.current = null;
      setTurnstileToken("");
    };
  }, [siteKey, stage, mode]);

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
        body: JSON.stringify({ name, email, password, ...(siteKey ? { turnstileToken } : {}) })
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        verificationRequired?: boolean;
        email?: string;
        retryAfterSeconds?: number;
      };
      if (response.status === 429) { setRetryAfter(body.retryAfterSeconds ?? 60); return; }
      if (!response.ok) {
        if (response.status === 403 && body.verificationRequired && body.email) {
          setPendingEmail(body.email);
          setStage("verify");
          setInfo("Your email is not verified yet. Enter the code we sent to continue.");
          return;
        }
        // Reset Turnstile so the user gets a fresh token on retry
        if (turnstileWidgetId.current && window.turnstile) {
          window.turnstile.reset(turnstileWidgetId.current);
          setTurnstileToken("");
        }
        throw new Error(body.error || "Authentication failed");
      }
      if (body.verificationRequired) {
        setPendingEmail(body.email || email.trim().toLowerCase());
        setCode("");
        setStage("verify");
        setInfo("Account created. Enter the verification code we sent to your email.");
        return;
      }
      window.location.replace(nextUrl);
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
      const body = (await response.json().catch(() => ({}))) as { error?: string; retryAfterSeconds?: number };
      if (response.status === 429) { setRetryAfter(body.retryAfterSeconds ?? 60); return; }
      if (!response.ok) throw new Error(body.error || "Verification failed");
      window.location.replace("/");
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
      const body = (await response.json().catch(() => ({}))) as { error?: string; retryAfterSeconds?: number };
      if (response.status === 429) { setRetryAfter(body.retryAfterSeconds ?? 60); return; }
      if (!response.ok) throw new Error(body.error || "Unable to resend code");
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
      const body = (await response.json().catch(() => ({}))) as { retryAfterSeconds?: number };
      if (response.status === 429) { setRetryAfter(body.retryAfterSeconds ?? 60); return; }
      setInfo("If an account exists for that email, a reset link has been sent.");
    } catch {
      setInfo("If an account exists for that email, a reset link has been sent.");
    } finally {
      setBusy(false);
    }
  }

  async function submitReset() {
    if (newPassword.length < 12) { setError("Password must be at least 12 characters."); return; }
    if (!/[A-Z]/.test(newPassword)) { setError("Password must contain at least one uppercase letter."); return; }
    if (!/[0-9]/.test(newPassword)) { setError("Password must contain at least one number."); return; }
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
      const body = (await response.json().catch(() => ({}))) as { error?: string; retryAfterSeconds?: number };
      if (response.status === 429) { setRetryAfter(body.retryAfterSeconds ?? 60); return; }
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

  const stageTitle =
    stage === "verify" ? "Verify email"
    : stage === "forgot" ? "Forgot password"
    : stage === "reset"  ? "Reset password"
    : mode === "login"   ? "Sign in"
    : "Create account";

  const stageSubtitle =
    stage === "verify" ? `Enter the verification code for ${pendingEmail || email}.`
    : stage === "forgot" ? "Enter your email and we'll send you a reset link."
    : stage === "reset"  ? "Enter your new password below."
    : mode === "login"   ? "Sign in to your study workspace."
    : "Create your personal study workspace.";

  return (
    <main className="grid min-h-screen place-items-center bg-black px-4 py-10 text-frost">
      <div className="w-full max-w-md rounded-[16px] border border-graphite-rail bg-[#0b0e14] p-8">

        {/* Header */}
        <div className="mb-6">
          <div className="mb-5 flex items-center gap-2">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ background: "linear-gradient(to right bottom in oklab, rgb(146,129,247) 0%, rgb(154,84,220) 100%)" }}
            >
              <BookOpen className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-[14px] font-medium text-frost">EternalNotes</span>
          </div>
          <h1 className="text-[22px] font-semibold text-white">{stageTitle}</h1>
          <p className="mt-1.5 text-[14px] leading-[1.5] text-fog">{stageSubtitle}</p>
        </div>

        {/* Tab switcher */}
        {stage === "auth" ? (
          <div className="mb-5 flex gap-1 rounded-[8px] border border-graphite-rail p-1">
            <TabBtn active={mode === "login"} onClick={() => { setMode("login"); reset(); }}>Sign in</TabBtn>
            {allowSignup ? (
              <TabBtn active={mode === "signup"} onClick={() => { setMode("signup"); reset(); }}>
                Create account
              </TabBtn>
            ) : null}
          </div>
        ) : null}

        {/* Auth stage */}
        {stage === "auth" ? (
          <>
            <div className="space-y-3">
              {mode === "signup" ? (
                <Field icon={<User2 className="h-4 w-4" />} label="Name">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-transparent text-[14px] text-frost outline-none placeholder:text-steel"
                    placeholder="Your name"
                  />
                </Field>
              ) : null}
              <Field icon={<Mail className="h-4 w-4" />} label="Email">
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent text-[14px] text-frost outline-none placeholder:text-steel"
                  placeholder="you@example.com"
                  autoComplete="email"
                  type="email"
                />
              </Field>
              <Field icon={<LockKeyhole className="h-4 w-4" />} label="Password">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent text-[14px] text-frost outline-none placeholder:text-steel"
                  placeholder="12+ chars, 1 uppercase, 1 number"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  onKeyDown={(e) => e.key === "Enter" && void submit()}
                />
              </Field>
            </div>
            {siteKey && mode === "signup" && (
              <div ref={turnstileRef} className="mt-4" />
            )}
            {info ? <InfoBanner>{info}</InfoBanner> : null}
            {retryAfter > 0 ? <RateLimitBanner seconds={retryAfter} /> : error ? <ErrorBanner>{error}</ErrorBanner> : null}
            <button
              type="button"
              onClick={() => void submit()}
              disabled={busy || retryAfter > 0 || !email.trim() || password.trim().length < 8 || (mode === "signup" && !name.trim()) || (mode === "signup" && !!siteKey && !turnstileToken)}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-[6px] border border-electric-blue py-3 text-[14px] font-medium text-white transition-colors hover:bg-electric-blue/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {mode === "login" ? "Sign in" : "Create account"}
            </button>
            {mode === "login" ? (
              <button
                type="button"
                onClick={() => { reset(); setStage("forgot"); }}
                className="mt-3 block w-full text-center text-[13px] text-fog transition-colors hover:text-frost"
              >
                Forgot password?
              </button>
            ) : null}
            {mode === "signup" ? (
              <p className="mt-3 text-center text-[12px] leading-[1.5] text-steel">
                By creating an account you agree to our{" "}
                <a href="/legal/terms" target="_blank" rel="noopener noreferrer" className="text-fog underline hover:text-frost">Terms</a>
                {" "}and{" "}
                <a href="/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-fog underline hover:text-frost">Privacy Policy</a>.
              </p>
            ) : null}
            {!allowSignup ? (
              <p className="mt-4 text-[12px] leading-[1.5] text-steel">
                Registration is disabled on this instance. Use an existing account.
              </p>
            ) : null}
          </>
        ) : stage === "verify" ? (
          <>
            <div className="space-y-3">
              <Field icon={<Mail className="h-4 w-4" />} label="Email">
                <input value={pendingEmail} readOnly className="w-full bg-transparent text-[14px] text-fog outline-none" />
              </Field>
              <Field icon={<KeyRound className="h-4 w-4" />} label="Verification code">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full bg-transparent text-[14px] text-frost outline-none placeholder:text-steel"
                  placeholder="6-digit code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  onKeyDown={(e) => e.key === "Enter" && void verify()}
                />
              </Field>
            </div>
            {info ? <InfoBanner>{info}</InfoBanner> : null}
            {retryAfter > 0 ? <RateLimitBanner seconds={retryAfter} /> : error ? <ErrorBanner>{error}</ErrorBanner> : null}
            <button
              type="button"
              onClick={() => void verify()}
              disabled={busy || retryAfter > 0 || code.trim().length < 4}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-[6px] border border-electric-blue py-3 text-[14px] font-medium text-white transition-colors hover:bg-electric-blue/10 disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Verify email
            </button>
            <div className="mt-3 flex items-center justify-between gap-3">
              <button type="button" onClick={() => void resend()} disabled={busy} className="text-[13px] font-medium text-fog transition-colors hover:text-frost disabled:opacity-40">
                Resend code
              </button>
              <button type="button" onClick={() => { setStage("auth"); setCode(""); reset(); }} disabled={busy} className="text-[13px] text-steel transition-colors hover:text-fog disabled:opacity-40">
                Back
              </button>
            </div>
          </>
        ) : stage === "forgot" ? (
          <>
            <div className="space-y-3">
              <Field icon={<Mail className="h-4 w-4" />} label="Email">
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent text-[14px] text-frost outline-none placeholder:text-steel"
                  placeholder="you@example.com"
                  type="email"
                  autoComplete="email"
                  onKeyDown={(e) => e.key === "Enter" && void sendForgotPassword()}
                />
              </Field>
            </div>
            {info ? <InfoBanner>{info}</InfoBanner> : null}
            {retryAfter > 0 ? <RateLimitBanner seconds={retryAfter} /> : error ? <ErrorBanner>{error}</ErrorBanner> : null}
            <button
              type="button"
              onClick={() => void sendForgotPassword()}
              disabled={busy || retryAfter > 0 || !email.trim()}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-[6px] border border-electric-blue py-3 text-[14px] font-medium text-white transition-colors hover:bg-electric-blue/10 disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Send reset link
            </button>
            <button
              type="button"
              onClick={() => { setStage("auth"); reset(); }}
              className="mt-3 block w-full text-center text-[13px] text-steel transition-colors hover:text-fog"
            >
              Back to sign in
            </button>
          </>
        ) : (
          <>
            <div className="space-y-3">
              <Field icon={<LockKeyhole className="h-4 w-4" />} label="New password">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-transparent text-[14px] text-frost outline-none placeholder:text-steel"
                  placeholder="12+ chars, 1 uppercase, 1 number"
                  autoComplete="new-password"
                  onKeyDown={(e) => e.key === "Enter" && void submitReset()}
                />
              </Field>
            </div>
            {info ? <InfoBanner>{info}</InfoBanner> : null}
            {retryAfter > 0 ? <RateLimitBanner seconds={retryAfter} /> : error ? <ErrorBanner>{error}</ErrorBanner> : null}
            <button
              type="button"
              onClick={() => void submitReset()}
              disabled={busy || retryAfter > 0 || newPassword.length < 12}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-[6px] border border-electric-blue py-3 text-[14px] font-medium text-white transition-colors hover:bg-electric-blue/10 disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Set new password
            </button>
          </>
        )}
      </div>
    </main>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-[6px] px-3 py-2 text-[13px] font-medium transition-colors ${
        active
          ? "bg-white/[0.08] text-white"
          : "text-fog hover:text-frost"
      }`}
    >
      {children}
    </button>
  );
}

function Field({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-[12px] font-medium text-steel">{label}</div>
      <div className="flex items-center gap-2 rounded-[8px] border border-graphite-rail bg-black px-3 py-3 text-fog">
        {icon}
        {children}
      </div>
    </label>
  );
}

function InfoBanner({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 rounded-[8px] border border-electric-blue/20 bg-electric-blue/5 px-3 py-2 text-[13px] text-electric-blue">
      {children}
    </div>
  );
}

function ErrorBanner({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 rounded-[8px] border border-bounced-red/25 bg-bounced-red/5 px-3 py-2 text-[13px] text-bounced-red">
      {children}
    </div>
  );
}

function RateLimitBanner({ seconds }: { seconds: number }) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const display = m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}s`;
  return (
    <div className="mt-4 rounded-[8px] border border-complained-yellow/20 bg-complained-yellow/5 px-3 py-2 text-[13px] text-complained-yellow">
      Too many attempts. Try again in{" "}
      <span className="font-semibold tabular-nums">{display}</span>.
    </div>
  );
}
