"use client";

import { BookOpen, KeyRound, Loader2, LockKeyhole, Mail, User2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LogoMark } from "@/components/landing/logo";

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

  useEffect(() => {
    if (!siteKey) return;
    if (document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]')) return;
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v1/api.js?render=explicit";
    script.async = true;
    document.head.appendChild(script);
  }, [siteKey]);

  // Render widget when signup form is visible, clean up when leaving.
  // Fails silently — server falls back to rate-limiting when no token arrives.
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
        theme: "dark"
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

  function resetNotices() {
    setError(null);
    setInfo(null);
  }

  async function submit() {
    setBusy(true);
    resetNotices();
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
        debugCode?: string | null;
        retryAfterSeconds?: number;
      };
      if (response.status === 429) {
        setRetryAfter(body.retryAfterSeconds ?? 60);
        return;
      }
      if (!response.ok && response.status === 400 && body.error?.toLowerCase().includes("bot")) {
        if (turnstileWidgetId.current && window.turnstile) {
          window.turnstile.reset(turnstileWidgetId.current);
          setTurnstileToken("");
        }
        throw new Error(body.error || "Bot verification failed");
      }
      if (!response.ok) {
        if (response.status === 403 && body.verificationRequired && body.email) {
          setPendingEmail(body.email);
          setStage("verify");
          setInfo(
            `Your email is not verified yet. Enter the code we sent to ${body.email}.` +
              (body.debugCode ? ` (Debug code: ${body.debugCode})` : "")
          );
          return;
        }
        throw new Error(body.error || "Authentication failed");
      }

      if (body.verificationRequired && body.email) {
        setPendingEmail(body.email);
        setStage("verify");
        setInfo(
          `Enter the code we sent to ${body.email}.` + (body.debugCode ? ` (Debug code: ${body.debugCode})` : "")
        );
        return;
      }

      window.location.href = nextUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setBusy(true);
    resetNotices();
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({ email: pendingEmail || email })
      });
      const body = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string; debugCode?: string | null; retryAfterSeconds?: number };
      if (response.status === 429) {
        setRetryAfter(body.retryAfterSeconds ?? 60);
        return;
      }
      if (!response.ok) throw new Error(body.error || "Unable to resend code");
      setInfo(`Verification code sent.` + (body.debugCode ? ` (Debug code: ${body.debugCode})` : ""));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to resend code");
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setBusy(true);
    resetNotices();
    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({ email: pendingEmail || email, code })
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string; retryAfterSeconds?: number };
      if (response.status === 429) {
        setRetryAfter(body.retryAfterSeconds ?? 60);
        return;
      }
      if (!response.ok) throw new Error(body.error || "Verification failed");
      window.location.href = nextUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  }

  async function sendForgotPassword() {
    setBusy(true);
    resetNotices();
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({ email })
      });
      const body = (await response.json().catch(() => ({}))) as { ok?: boolean; debugUrl?: string | null; error?: string; retryAfterSeconds?: number };
      if (response.status === 429) {
        setRetryAfter(body.retryAfterSeconds ?? 60);
        return;
      }
      if (!response.ok) throw new Error(body.error || "Unable to send reset link");
      setInfo(
        "If an account exists for that email, we sent a reset link." +
          (body.debugUrl ? ` (Debug: ${body.debugUrl})` : "")
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send reset link");
    } finally {
      setBusy(false);
    }
  }

  async function submitReset() {
    setBusy(true);
    resetNotices();
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({ email: pendingEmail, token: resetToken, newPassword })
      });
      const body = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string; retryAfterSeconds?: number };
      if (response.status === 429) {
        setRetryAfter(body.retryAfterSeconds ?? 60);
        return;
      }
      if (!response.ok) throw new Error(body.error || "Password reset failed");
      setInfo("Password updated. You can sign in now.");
      setStage("auth");
      setMode("login");
      setPassword("");
      setNewPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password reset failed");
    } finally {
      setBusy(false);
    }
  }

  const stageTitle =
    stage === "verify"
      ? "Verify email"
      : stage === "forgot"
        ? "Forgot password"
        : stage === "reset"
          ? "Reset password"
          : mode === "login"
            ? "Sign in"
            : "Create account";

  const stageSubtitle =
    stage === "verify"
      ? `Enter the verification code for ${pendingEmail || email}.`
      : stage === "forgot"
        ? "Enter your email and we’ll send you a reset link."
        : stage === "reset"
          ? "Set a new password for your account."
          : mode === "login"
            ? "Sign in to your private research workspace."
            : "Create your workspace. Verify email to continue.";

  const canSubmitAuth =
    retryAfter <= 0 &&
    !!email.trim() &&
    (mode === "login" ? !!password.trim() : name.trim().length > 0 && password.trim().length >= 12);

  return (
    <div className="relative min-h-screen overflow-hidden bg-ink-950 text-ink-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-220px] h-[520px] w-[860px] -translate-x-1/2 rounded-full bg-accent-500/[0.10] blur-[120px]" />
        <div className="absolute right-[-220px] top-[240px] h-[520px] w-[520px] rounded-full bg-accent-400/[0.05] blur-[130px]" />
      </div>

      <div className="relative mx-auto grid w-full max-w-[1080px] items-stretch gap-8 px-4 py-10 lg:grid-cols-[1fr_440px] lg:px-6 lg:py-16">
        <aside className="hidden flex-col justify-between rounded-3xl border border-ink-750/40 bg-ink-925/35 p-8 lg:flex">
          <div>
            <div className="flex items-center gap-3">
              <LogoMark size={34} />
              <div>
                <div className="text-[14px] font-semibold text-ink-100">EternalNotes</div>
                <div className="text-[12px] text-ink-500">Private-first, grounded RAG</div>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <div className="text-[24px] font-semibold leading-tight text-ink-100">
                Serious notes.
                <br />
                Grounded answers.
              </div>
              <div className="text-[14px] leading-7 text-ink-400">
                A calm, premium workspace built for research: citations, provenance, and study tools without the noise.
              </div>

              <div className="mt-6 grid gap-3">
                <ValueRow icon={<ShieldTile /> } title="Citations by default" desc="Verify every answer with excerpts." />
                <ValueRow icon={<LockTile /> } title="Private-first" desc="Your knowledge stays under your control." />
                <ValueRow icon={<StudyTile /> } title="Study built in" desc="Quizzes and flashcards from your notes." />
              </div>
            </div>
          </div>

          <div className="mt-10 rounded-2xl border border-ink-750/40 bg-ink-950/20 p-5">
            <div className="text-[12px] font-semibold text-ink-500">Tip</div>
            <div className="mt-2 text-[13px] leading-6 text-ink-400">
              Use a password manager. For self-hosted setups, you can also enable email verification and rate limiting for extra safety.
            </div>
          </div>
        </aside>

        <Card className="relative overflow-hidden">
          <div className="p-7 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-ink-750/50 bg-ink-950/25">
                  <BookOpen className="h-5 w-5 text-accent-300" />
                </div>
                <div>
                  <div className="text-[16px] font-semibold text-ink-100">{stageTitle}</div>
                  <div className="mt-1 text-[13px] leading-6 text-ink-500">{stageSubtitle}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="neutral" className="hidden sm:inline-flex">
                  Secure by default
                </Badge>
              </div>
            </div>

            {stage === "auth" ? (
              <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl border border-ink-750/50 bg-ink-950/15 p-1">
                <ModeBtn active={mode === "login"} onClick={() => { setMode("login"); resetNotices(); }}>
                  Sign in
                </ModeBtn>
                <ModeBtn
                  active={mode === "signup"}
                  disabled={!allowSignup}
                  onClick={() => { setMode("signup"); resetNotices(); }}
                >
                  Create account
                </ModeBtn>
              </div>
            ) : null}

            <div className="mt-6 space-y-4">
              {stage === "auth" ? (
                <>
                  {mode === "signup" ? (
                    <Field label="Name" error={!name.trim() && error ? "Required" : undefined}>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                        autoComplete="name"
                      />
                    </Field>
                  ) : null}

                  <Field label="Email">
                    <Input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      type="email"
                    />
                  </Field>

                  <Field
                    label="Password"
                    hint={mode === "signup" ? "12+ chars, 1 uppercase, 1 number" : undefined}
                  >
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={mode === "signup" ? "Create a strong password" : "Your password"}
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                      onKeyDown={(e) => e.key === "Enter" && void submit()}
                    />
                    {mode === "signup" && password.length > 0 ? <PasswordRules password={password} /> : null}
                  </Field>

                  {siteKey && mode === "signup" ? <div ref={turnstileRef} className="pt-2" /> : null}

                  {info ? <Banner tone="info">{info}</Banner> : null}
                  {retryAfter > 0 ? <RateLimitBanner seconds={retryAfter} /> : error ? <Banner tone="error">{error}</Banner> : null}

                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full"
                    onClick={() => void submit()}
                    loading={busy}
                    disabled={!canSubmitAuth || busy}
                    leftIcon={mode === "login" ? <Mail className="h-4 w-4" /> : <User2 className="h-4 w-4" />}
                  >
                    {mode === "login" ? "Sign in" : "Create account"}
                  </Button>

                  {mode === "login" ? (
                    <button
                      type="button"
                      onClick={() => { resetNotices(); setStage("forgot"); }}
                      className="w-full rounded-xl px-3 py-2 text-[13px] font-medium text-ink-500 hover:text-ink-200 focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                    >
                      Forgot password?
                    </button>
                  ) : (
                    <div className="text-center text-[12px] leading-6 text-ink-600">
                      By creating an account you agree to our{" "}
                      <Link href="/legal/terms" className="text-ink-300 underline underline-offset-2 hover:text-ink-100">
                        Terms
                      </Link>{" "}
                      and{" "}
                      <Link href="/legal/privacy" className="text-ink-300 underline underline-offset-2 hover:text-ink-100">
                        Privacy Policy
                      </Link>
                      .
                    </div>
                  )}

                  {!allowSignup ? (
                    <div className="rounded-2xl border border-ink-750/50 bg-ink-950/15 px-4 py-3 text-[12px] leading-6 text-ink-500">
                      Registration is disabled on this instance. Use an existing account.
                    </div>
                  ) : null}
                </>
              ) : stage === "verify" ? (
                <>
                  <Field label="Email">
                    <Input value={pendingEmail} readOnly />
                  </Field>
                  <Field label="Verification code" hint="Check your inbox (and spam).">
                    <Input
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="6-digit code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      onKeyDown={(e) => e.key === "Enter" && void verify()}
                    />
                  </Field>

                  {info ? <Banner tone="info">{info}</Banner> : null}
                  {retryAfter > 0 ? <RateLimitBanner seconds={retryAfter} /> : error ? <Banner tone="error">{error}</Banner> : null}

                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full"
                    onClick={() => void verify()}
                    loading={busy}
                    disabled={busy || retryAfter > 0 || code.trim().length < 4}
                    leftIcon={<KeyRound className="h-4 w-4" />}
                  >
                    Verify email
                  </Button>

                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => void resend()}
                      disabled={busy || retryAfter > 0}
                      className="rounded-xl px-3 py-2 text-[13px] font-medium text-ink-400 hover:text-ink-100 focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] disabled:opacity-50"
                    >
                      Resend code
                    </button>
                    <button
                      type="button"
                      onClick={() => { setStage("auth"); setCode(""); resetNotices(); }}
                      disabled={busy}
                      className="rounded-xl px-3 py-2 text-[13px] text-ink-600 hover:text-ink-300 focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] disabled:opacity-50"
                    >
                      Back
                    </button>
                  </div>
                </>
              ) : stage === "forgot" ? (
                <>
                  <Field label="Email">
                    <Input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      type="email"
                    />
                  </Field>

                  {info ? <Banner tone="info">{info}</Banner> : null}
                  {retryAfter > 0 ? <RateLimitBanner seconds={retryAfter} /> : error ? <Banner tone="error">{error}</Banner> : null}

                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full"
                    onClick={() => void sendForgotPassword()}
                    loading={busy}
                    disabled={busy || retryAfter > 0 || !email.trim()}
                    leftIcon={<Mail className="h-4 w-4" />}
                  >
                    Send reset link
                  </Button>

                  <button
                    type="button"
                    onClick={() => { setStage("auth"); resetNotices(); }}
                    className="w-full rounded-xl px-3 py-2 text-[13px] text-ink-600 hover:text-ink-300 focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                  >
                    Back to sign in
                  </button>
                </>
              ) : (
                <>
                  <Field label="Email">
                    <Input value={pendingEmail} readOnly />
                  </Field>
                  <Field label="New password" hint="12+ chars, 1 uppercase, 1 number">
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Set a strong password"
                      autoComplete="new-password"
                      onKeyDown={(e) => e.key === "Enter" && void submitReset()}
                    />
                    {newPassword.length > 0 ? <PasswordRules password={newPassword} /> : null}
                  </Field>

                  {info ? <Banner tone="info">{info}</Banner> : null}
                  {retryAfter > 0 ? <RateLimitBanner seconds={retryAfter} /> : error ? <Banner tone="error">{error}</Banner> : null}

                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full"
                    onClick={() => void submitReset()}
                    loading={busy}
                    disabled={busy || retryAfter > 0 || newPassword.length < 12}
                    leftIcon={<LockKeyhole className="h-4 w-4" />}
                  >
                    Set new password
                  </Button>
                </>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function ModeBtn({
  active,
  disabled,
  onClick,
  children
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "h-10 rounded-xl px-3 text-[13px] font-semibold transition-all duration-200 ease-premium focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] disabled:opacity-40",
        active ? "bg-ink-875/70 text-ink-100" : "text-ink-500 hover:text-ink-200"
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function PasswordRules({ password }: { password: string }) {
  const rules = [
    { label: "At least 12 characters", met: password.length >= 12 },
    { label: "One uppercase letter", met: /[A-Z]/.test(password) },
    { label: "One number", met: /[0-9]/.test(password) }
  ];
  return (
    <div className="mt-3 grid gap-1.5 rounded-2xl border border-ink-750/50 bg-ink-950/10 p-3">
      {rules.map((r) => (
        <div key={r.label} className={["flex items-center justify-between gap-3 text-[12px]", r.met ? "text-success-300" : "text-ink-600"].join(" ")}>
          <span>{r.label}</span>
          <span className="font-semibold">{r.met ? "Met" : "—"}</span>
        </div>
      ))}
    </div>
  );
}

function Banner({ tone, children }: { tone: "info" | "error"; children: ReactNode }) {
  const styles =
    tone === "info"
      ? "border-accent-400/20 bg-accent-500/10 text-ink-200"
      : "border-danger-400/25 bg-danger-400/10 text-danger-200";
  return <div className={`rounded-2xl border px-4 py-3 text-[13px] leading-6 ${styles}`}>{children}</div>;
}

function RateLimitBanner({ seconds }: { seconds: number }) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const display = m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}s`;
  return (
    <div className="rounded-2xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-[13px] leading-6 text-amber-200">
      Too many attempts. Try again in <span className="font-semibold tabular-nums">{display}</span>.
    </div>
  );
}

function ValueRow({ icon, title, desc }: { icon: ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-ink-750/40 bg-ink-950/15 px-4 py-3">
      <div className="mt-0.5">{icon}</div>
      <div>
        <div className="text-[13px] font-semibold text-ink-100">{title}</div>
        <div className="text-[13px] leading-6 text-ink-500">{desc}</div>
      </div>
    </div>
  );
}

function Tile({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-ink-750/50 bg-ink-925/50 text-ink-200">
      {children}
    </div>
  );
}

function ShieldTile() {
  return (
    <Tile>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 2l7 4v6c0 5-3 9-7 10-4-1-7-5-7-10V6l7-4z"
          stroke="rgb(var(--accent-300) / 0.9)"
          strokeWidth="1.6"
        />
        <path
          d="M9.4 12.2l1.8 1.8 3.7-3.7"
          stroke="rgb(var(--accent-300) / 0.9)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </Tile>
  );
}

function LockTile() {
  return (
    <Tile>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M7 11V8a5 5 0 0110 0v3"
          stroke="rgb(var(--accent-300) / 0.9)"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M7 11h10v9H7z"
          stroke="rgb(var(--accent-300) / 0.9)"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    </Tile>
  );
}

function StudyTile() {
  return (
    <Tile>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 19V7a2 2 0 012-2h11a3 3 0 013 3v12"
          stroke="rgb(var(--accent-300) / 0.9)"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M6 17h14"
          stroke="rgb(var(--accent-300) / 0.9)"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    </Tile>
  );
}
