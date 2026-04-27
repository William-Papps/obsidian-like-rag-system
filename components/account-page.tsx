"use client";

import Link from "next/link";
import { ArrowLeft, CreditCard, Download, KeyRound, Loader2, LogOut, Save, ShieldCheck, Sparkles, User2 } from "lucide-react";
import { type KeyboardEvent, type ReactNode, useMemo, useState } from "react";
import type { AdminUserSummary, AuditLog, BillingState, ProviderSettings, RuntimeSettings, StudyActivity } from "@/lib/types";

type AccountUser = {
  id: string;
  email: string;
  name: string;
};

type Notice = {
  tone: "success" | "error" | "info";
  message: string;
} | null;

type Section = "profile" | "ai" | "billing" | "security" | "backup" | "admin";

export function AccountPage({
  user,
  initialSettings,
  initialBilling,
  initialAdmin,
  initialActivity
}: {
  user: AccountUser;
  initialSettings: ProviderSettings;
  initialBilling: BillingState;
  initialAdmin: { runtime: RuntimeSettings; users: AdminUserSummary[]; logs: AuditLog[] } | null;
  initialActivity: StudyActivity[];
}) {
  const [section, setSection] = useState<Section>("ai");
  const [settings, setSettings] = useState(initialSettings);
  const [billing, setBilling] = useState(initialBilling);
  const [apiKey, setApiKey] = useState("");
  const [clearApiKey, setClearApiKey] = useState(false);
  const [projectId, setProjectId] = useState(initialSettings.projectId ?? "");
  const [embeddingModel, setEmbeddingModel] = useState(initialSettings.embeddingModel);
  const [answerModel, setAnswerModel] = useState(initialSettings.answerModel);
  const [visionModel, setVisionModel] = useState(initialSettings.visionModel ?? "");
  const [billingName, setBillingName] = useState(initialBilling.profile.billingName ?? user.name);
  const [billingEmail, setBillingEmail] = useState(initialBilling.profile.billingEmail ?? user.email);
  const [hostedPlan, setHostedPlan] = useState(initialBilling.subscription.plan);
  const [adminData, setAdminData] = useState(initialAdmin);
  const [activity] = useState(initialActivity);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingBilling, setSavingBilling] = useState(false);
  const [savingAdmin, setSavingAdmin] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [downloadingBackup, setDownloadingBackup] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const aiStatus = useMemo(() => {
    if (settings.maskedKey) return "Personal key active. AI runs on your own provider account and does not consume hosted quota.";
    if (billing.subscription.plan !== "free" && settings.hostedKeyAvailable && billing.hostedAccessGranted) return `Hosted AI active on the ${billing.subscription.plan} plan.`;
    if (billing.subscription.plan !== "free" && settings.hostedKeyAvailable && !billing.hostedAccessGranted) {
      return "Hosted plan selected, but server-key usage is pending owner approval for this account.";
    }
    return "Notes remain free. Without a personal key or hosted plan, AI falls back to local behavior where available.";
  }, [billing.hostedAccessGranted, billing.subscription.plan, settings.hostedKeyAvailable, settings.maskedKey]);

  function pushNotice(message: string, tone: NonNullable<Notice>["tone"]) {
    setNotice({ message, tone });
    window.setTimeout(() => {
      setNotice((current) => (current?.message === message ? null : current));
    }, 3200);
  }

  async function saveSettings() {
    setSavingSettings(true);
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ apiKey, clearApiKey, projectId, embeddingModel, answerModel, visionModel })
      });
      const body = (await response.json().catch(() => ({}))) as ProviderSettings & { error?: string };
      if (!response.ok) throw new Error(body.error || "Unable to save settings");
      setSettings(body as ProviderSettings);
      setApiKey("");
      setClearApiKey(false);
      setProjectId(body.projectId ?? "");
      setEmbeddingModel(body.embeddingModel);
      setAnswerModel(body.answerModel);
      setVisionModel(body.visionModel ?? "");
      pushNotice("Account settings saved", "success");
    } catch (error) {
      pushNotice(error instanceof Error ? error.message : "Unable to save settings", "error");
    } finally {
      setSavingSettings(false);
    }
  }

  async function saveBilling() {
    setSavingBilling(true);
    try {
      const response = await fetch("/api/billing", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ billingName, billingEmail, plan: hostedPlan })
      });
      const body = (await response.json().catch(() => ({}))) as {
        billing?: BillingState;
        settings?: ProviderSettings;
        error?: string;
      };
      if (!response.ok || !body.billing || !body.settings) throw new Error(body.error || "Unable to save billing");
      setBilling(body.billing);
      setSettings(body.settings);
      setHostedPlan(body.billing.subscription.plan);
      setBillingName(body.billing.profile.billingName ?? "");
      setBillingEmail(body.billing.profile.billingEmail ?? "");
      pushNotice("Billing setup saved", "success");
    } catch (error) {
      pushNotice(error instanceof Error ? error.message : "Unable to save billing", "error");
    } finally {
      setSavingBilling(false);
    }
  }

  async function savePassword() {
    setChangingPassword(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(body.error || "Unable to change password");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      pushNotice("Password updated", "success");
    } catch (error) {
      pushNotice(error instanceof Error ? error.message : "Unable to change password", "error");
    } finally {
      setChangingPassword(false);
    }
  }

  async function downloadBackup() {
    setDownloadingBackup(true);
    try {
      const response = await fetch("/api/backup");
      if (!response.ok) throw new Error("Backup export failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      const disposition = response.headers.get("content-disposition");
      const match = disposition?.match(/filename="([^"]+)"/);
      anchor.download = match?.[1] || "eternalnotes-backup.db";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      pushNotice("Backup downloaded", "success");
    } catch (error) {
      pushNotice(error instanceof Error ? error.message : "Backup export failed", "error");
    } finally {
      setDownloadingBackup(false);
    }
  }

  async function signOut() {
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/auth";
    } finally {
      setSigningOut(false);
    }
  }

  const navItems: Array<{ id: Section; label: string; icon: typeof User2 }> = [
    { id: "profile", label: "Profile", icon: User2 },
    { id: "ai", label: "AI Settings", icon: Sparkles },
    { id: "billing", label: "Billing", icon: CreditCard },
    { id: "security", label: "Security", icon: ShieldCheck },
    { id: "backup", label: "Backup", icon: Download },
    ...(initialAdmin ? [{ id: "admin" as const, label: "Admin", icon: ShieldCheck }] : [])
  ];

  async function saveAdminRuntime(next: Partial<RuntimeSettings>) {
    setSavingAdmin(true);
    try {
      const response = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(next)
      });
      const body = (await response.json().catch(() => ({}))) as { runtime?: RuntimeSettings; error?: string };
      if (!response.ok || !body.runtime) throw new Error(body.error || "Unable to update admin settings");
      setAdminData((current) => (current ? { ...current, runtime: body.runtime! } : current));
      pushNotice("Runtime settings updated", "success");
    } catch (error) {
      pushNotice(error instanceof Error ? error.message : "Unable to update admin settings", "error");
    } finally {
      setSavingAdmin(false);
    }
  }

  async function updateManagedUser(targetUserId: string, input: { role?: "user" | "admin" | "owner"; disabled?: boolean; hostedPlan?: "free" | "starter" | "pro"; hostedAccessGranted?: boolean }) {
    setSavingAdmin(true);
    try {
      const response = await fetch(`/api/admin/users/${targetUserId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input)
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(body.error || "Unable to update user");
      const refresh = await fetch("/api/admin");
      const refreshed = (await refresh.json()) as { runtime: RuntimeSettings; users: AdminUserSummary[]; logs: AuditLog[] };
      setAdminData(refreshed);
      pushNotice("User updated", "success");
    } catch (error) {
      pushNotice(error instanceof Error ? error.message : "Unable to update user", "error");
    } finally {
      setSavingAdmin(false);
    }
  }

  async function deleteManagedUser(targetUserId: string) {
    setSavingAdmin(true);
    try {
      const response = await fetch(`/api/admin/users/${targetUserId}`, { method: "DELETE" });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(body.error || "Unable to delete user");
      const refresh = await fetch("/api/admin");
      const refreshed = (await refresh.json()) as { runtime: RuntimeSettings; users: AdminUserSummary[]; logs: AuditLog[] };
      setAdminData(refreshed);
      pushNotice("User deleted", "success");
    } catch (error) {
      pushNotice(error instanceof Error ? error.message : "Unable to delete user", "error");
    } finally {
      setSavingAdmin(false);
    }
  }

  return (
    <main className="min-h-screen bg-ink-950 text-ink-100">
      <div className="border-b border-ink-700/80 bg-ink-950/90 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <Link href="/" className="inline-flex items-center gap-2 text-xs font-medium text-ink-500 hover:text-ink-300">
              <ArrowLeft className="h-4 w-4" />
              Back to workspace
            </Link>
            <div className="mt-2 text-2xl font-semibold tracking-tight text-ink-100">Account</div>
            <div className="mt-1 text-sm text-ink-500">Manage your profile, AI access, hosted usage, and backups.</div>
          </div>
          <button
            onClick={signOut}
            disabled={signingOut}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-ink-700/80 px-4 text-sm font-medium text-ink-300 hover:bg-white/[0.04] disabled:opacity-60"
          >
            {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            Sign out
          </button>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-[1440px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="panel-shell rounded-2xl border border-ink-700/80 p-3">
          <div className="rounded-xl border border-accent-500/20 bg-accent-500/10 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-300">Signed in as</div>
            <div className="mt-2 truncate text-lg font-semibold text-ink-100">{user.name}</div>
            <div className="mt-1 truncate text-sm text-ink-400">{user.email}</div>
          </div>
          <div className="mt-4 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setSection(item.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${
                    active ? "border border-accent-500/30 bg-accent-500/12 text-ink-100" : "border border-transparent text-ink-400 hover:bg-white/[0.03] hover:text-ink-200"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? "text-accent-300" : ""}`} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </aside>

        <section className="space-y-6">
          {notice ? <NoticeBanner notice={notice} /> : null}

          {section === "profile" ? (
            <div className="panel-shell rounded-2xl border border-ink-700/80 p-6">
              <SectionHeading eyebrow="Profile" title="Account details" description="This area is for account identity and access, not note editing." />
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <MetricCard label="Display name" value={user.name} />
                <MetricCard label="Email" value={user.email} />
              </div>
              <div className="mt-6 rounded-xl border border-ink-700/80 bg-ink-950/40 p-4 text-sm leading-6 text-ink-400">
                The note system stays free. AI usage can run on a personal API key or on a hosted plan backed by the server key if the server owner has configured one.
              </div>
              <div className="mt-6 rounded-xl border border-ink-700/80 bg-ink-950/35 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Recent study activity</div>
                <div className="mt-3 space-y-2">
                  {activity.length ? (
                    activity.slice(0, 6).map((item) => (
                      <div key={item.id} className="rounded-lg border border-ink-700/80 px-3 py-2">
                        <div className="text-sm font-medium text-ink-200">{formatActivity(item.kind)}</div>
                        <div className="mt-1 text-xs text-ink-500">
                          {[item.scopeLabel, item.noteTitle].filter(Boolean).join(" - ") || "General activity"} - {new Date(item.createdAt).toLocaleString()}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-ink-500">No study activity recorded yet.</div>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {section === "ai" ? (
            <>
              <div className="panel-shell rounded-2xl border border-ink-700/80 p-6">
                <SectionHeading
                  eyebrow="AI setup"
                  title="Provider and model settings"
                  description="This section is for BYOK setup and model configuration. Billing and hosted plan selection live separately."
                />

                <div className="mt-6 rounded-xl border border-ink-700/80 bg-ink-950/40 p-4 text-sm leading-6 text-ink-400">{aiStatus}</div>

                <div className="mt-6 space-y-4">
                    <Field label={`OpenAI API key${settings.maskedKey ? ` (${settings.maskedKey})` : ""}`}>
                      <input
                        value={apiKey}
                        type="password"
                        placeholder="sk-..."
                        onKeyDown={allowNativeTextShortcuts}
                        onChange={(event) => setApiKey(event.target.value)}
                        className="control-soft w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                      />
                    </Field>

                    {settings.maskedKey ? (
                      <label className="flex items-center gap-2 rounded-lg border border-ink-700/80 bg-ink-950/40 px-3 py-2 text-sm text-ink-300">
                        <input type="checkbox" checked={clearApiKey} onChange={(event) => setClearApiKey(event.target.checked)} />
                        Clear saved personal API key and use hosted/local mode instead
                      </label>
                    ) : null}

                    <Field label="OpenAI project ID">
                      <input
                        value={projectId}
                        placeholder="Optional"
                        onKeyDown={allowNativeTextShortcuts}
                        onChange={(event) => setProjectId(event.target.value)}
                        className="control-soft w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                      />
                    </Field>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <Field label="Embedding model">
                        <input
                          value={embeddingModel}
                          onKeyDown={allowNativeTextShortcuts}
                          onChange={(event) => setEmbeddingModel(event.target.value)}
                          className="control-soft w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                        />
                      </Field>
                      <Field label="Answer model">
                        <input
                          value={answerModel}
                          onKeyDown={allowNativeTextShortcuts}
                          onChange={(event) => setAnswerModel(event.target.value)}
                          className="control-soft w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                        />
                      </Field>
                      <Field label="Vision model">
                        <input
                          value={visionModel}
                          placeholder="gpt-4o-mini"
                          onKeyDown={allowNativeTextShortcuts}
                          onChange={(event) => setVisionModel(event.target.value)}
                          className="control-soft w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                        />
                      </Field>
                    </div>

                    <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm leading-6 text-amber-300">
                      MVP local storage writes the personal key to an ignored file under <code>data/secrets</code>. Hosted deployment should replace this with encrypted per-user secret storage.
                    </div>

                    <button
                      onClick={saveSettings}
                      disabled={savingSettings}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-accent-500 px-4 text-sm font-semibold text-ink-950 shadow-glow hover:bg-accent-400 disabled:opacity-60"
                    >
                      {savingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {savingSettings ? "Saving..." : "Save AI settings"}
                    </button>
                </div>
              </div>
            </>
          ) : null}

          {section === "billing" ? (
            <>
              <div className="panel-shell rounded-2xl border border-ink-700/80 p-6">
                <SectionHeading
                  eyebrow="Billing"
                  title="Plan and billing setup"
                  description="The payment provider is not connected yet. This section stores billing identity, plan intent, and subscription state so Stripe can be added later without changing the product model."
                />
                <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <MetricCard label="Current plan" value={billing.subscription.plan === "free" ? "Free" : billing.subscription.plan === "starter" ? "AI Starter" : "AI Pro"} />
                      <MetricCard label="Subscription status" value={formatBillingStatus(billing.subscription.status)} />
                    </div>

                    <div className="rounded-xl border border-ink-700/80 bg-ink-950/35 p-4 text-sm leading-6 text-ink-400">
                      {billing.subscription.plan === "free"
                        ? "You are on the free notes-only tier. AI can still run with a personal key."
                        : billing.subscription.status === "manual"
                          ? "This hosted plan is active in manual pre-billing mode. It is suitable for local testing before Stripe is added."
                          : "Hosted billing has not been connected to a payment provider yet."}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Billing name">
                        <input
                          value={billingName}
                          onKeyDown={allowNativeTextShortcuts}
                          onChange={(event) => setBillingName(event.target.value)}
                          className="control-soft w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                        />
                      </Field>
                      <Field label="Billing email">
                        <input
                          value={billingEmail}
                          type="email"
                          onKeyDown={allowNativeTextShortcuts}
                          onChange={(event) => setBillingEmail(event.target.value)}
                          className="control-soft w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                        />
                      </Field>
                    </div>

                    <Field label={`Hosted AI plan${settings.hostedKeyAvailable ? "" : " (hosted key not configured on server)"}`}>
                      <select
                        value={hostedPlan}
                        onChange={(event) => setHostedPlan(event.target.value as typeof hostedPlan)}
                        className="control-soft w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                      >
                        <option value="free">Free notes-only / BYOK</option>
                        <option value="starter">AI Starter</option>
                        <option value="pro">AI Pro</option>
                      </select>
                    </Field>

                    {settings.hostedKeyAvailable && hostedPlan !== "free" ? (
                      <div className="rounded-xl border border-ink-700/80 bg-ink-950/35 p-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Hosted key access</div>
                        <div className="mt-2 text-sm leading-6 text-ink-400">
                          {billing.hostedAccessGranted
                            ? "This account is approved to use the server-managed key."
                            : "This account is not approved yet. Save your hosted plan choice here, then the owner can grant server-key access from the admin panel."}
                        </div>
                      </div>
                    ) : null}

                    <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm leading-6 text-amber-300">
                      Checkout, invoices, and payment methods are not active yet. Plan changes here are recorded locally and used to scaffold the future billing flow. Hosted server-key access is separately controlled by the owner per account.
                    </div>

                    <button
                      onClick={saveBilling}
                      disabled={savingBilling || !billingEmail.trim()}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-accent-500 px-4 text-sm font-semibold text-ink-950 shadow-glow hover:bg-accent-400 disabled:opacity-60"
                    >
                      {savingBilling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {savingBilling ? "Saving..." : "Save billing setup"}
                    </button>
                  </div>

                  <div className="space-y-4">
                    <PlanCard
                      title="Free"
                      active={hostedPlan === "free"}
                      description="Unlimited notes. Bring your own API key for AI."
                      bullets={["No hosted AI quota", "Notes and organization stay free", "BYOK enabled"]}
                    />
                    <PlanCard
                      title="AI Starter"
                      active={hostedPlan === "starter"}
                      description="Hosted AI with a conservative monthly cap."
                      bullets={["Ask 200", "Quiz 100", "Flashcards 100", "Summary 100", "OCR 50", "Index 75"]}
                    />
                    <PlanCard
                      title="AI Pro"
                      active={hostedPlan === "pro"}
                      description="Larger hosted allocation for regular study usage."
                      bullets={["Ask 600", "Quiz 300", "Flashcards 300", "Summary 300", "OCR 150", "Index 200"]}
                    />
                  </div>
                </div>
              </div>

              <div className="panel-shell rounded-2xl border border-ink-700/80 p-6">
                <SectionHeading
                  eyebrow="Usage"
                  title="Hosted AI quota"
                  description="BYOK does not consume hosted usage. These counters apply only when AI runs on the server-managed key."
                />
                <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {settings.usage.map((item) => (
                    <div key={item.feature} className="rounded-xl border border-ink-700/80 bg-ink-950/35 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-300">{item.feature}</div>
                        <div className="rounded-full border border-ink-700/80 px-2 py-1 text-[11px] text-ink-500">
                          {item.limit === null ? "Hosted disabled" : `${item.used} used`}
                        </div>
                      </div>
                      <div className="mt-3 text-lg font-semibold text-ink-100">
                        {item.limit === null ? "Unavailable" : `${item.remaining} remaining`}
                      </div>
                      <div className="mt-1 text-sm leading-6 text-ink-500">
                        {item.limit === null ? "Use your own API key or enable a hosted plan." : `Monthly limit ${item.limit}.`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}

          {section === "security" ? (
            <div className="panel-shell rounded-2xl border border-ink-700/80 p-6">
              <SectionHeading eyebrow="Security" title="Password and session access" description="Keep the account surface separate from the study workspace." />
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field label="Current password">
                  <input
                    value={currentPassword}
                    type="password"
                    onKeyDown={allowNativeTextShortcuts}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    className="control-soft w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                  />
                </Field>
                <div />
                <Field label="New password">
                  <input
                    value={newPassword}
                    type="password"
                    onKeyDown={allowNativeTextShortcuts}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className="control-soft w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                  />
                </Field>
                <Field label="Confirm new password">
                  <input
                    value={confirmPassword}
                    type="password"
                    onKeyDown={allowNativeTextShortcuts}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="control-soft w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                  />
                </Field>
              </div>
              <button
                onClick={savePassword}
                disabled={changingPassword || !currentPassword || newPassword.length < 8 || confirmPassword.length < 8}
                className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-accent-500 px-4 text-sm font-semibold text-ink-950 shadow-glow hover:bg-accent-400 disabled:opacity-60"
              >
                {changingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                {changingPassword ? "Updating password..." : "Change password"}
              </button>
            </div>
          ) : null}

          {section === "backup" ? (
            <div className="panel-shell rounded-2xl border border-ink-700/80 p-6">
              <SectionHeading eyebrow="Backup" title="Export database snapshot" description="Download the SQLite database so you can restore notes and indexes later." />
              <div className="mt-6 rounded-xl border border-ink-700/80 bg-ink-950/35 p-4 text-sm leading-6 text-ink-400">
                This export includes the database only. Files under <code>data/secrets</code> are not included and still need filesystem backup.
              </div>
              <button
                onClick={downloadBackup}
                disabled={downloadingBackup}
                className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-accent-500 px-4 text-sm font-semibold text-ink-950 shadow-glow hover:bg-accent-400 disabled:opacity-60"
              >
                {downloadingBackup ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {downloadingBackup ? "Preparing backup..." : "Download database backup"}
              </button>
            </div>
          ) : null}

          {section === "admin" && adminData ? (
            <>
              <div className="panel-shell rounded-2xl border border-ink-700/80 p-6">
                <SectionHeading eyebrow="Admin" title="Instance controls" description="Runtime controls for this self-hosted instance. These do not rewrite environment files; they persist in the local database." />
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <ToggleCard
                    label="Self signup"
                    description="Allow new users to register."
                    checked={adminData.runtime.selfSignupEnabled}
                    busy={savingAdmin}
                    onChange={(checked) => void saveAdminRuntime({ selfSignupEnabled: checked })}
                  />
                  <ToggleCard
                    label="Hosted AI"
                    description="Allow users to consume hosted plan quota on the server key."
                    checked={adminData.runtime.hostedAiEnabled}
                    busy={savingAdmin}
                    onChange={(checked) => void saveAdminRuntime({ hostedAiEnabled: checked })}
                  />
                  <ToggleCard
                    label="Email verification"
                    description="Require email verification before first login."
                    checked={adminData.runtime.emailVerificationEnabled}
                    busy={savingAdmin}
                    onChange={(checked) => void saveAdminRuntime({ emailVerificationEnabled: checked })}
                  />
                </div>
              </div>

              <div className="panel-shell rounded-2xl border border-ink-700/80 p-6">
                <SectionHeading eyebrow="Users" title="User management" description="Manually manage hosted plans, roles, and account access before billing automation exists." />
                <div className="mt-6 space-y-3">
                  {adminData.users.map((managedUser) => (
                    <div key={managedUser.id} className="rounded-xl border border-ink-700/80 bg-ink-950/35 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-ink-100">{managedUser.name}</div>
                          <div className="truncate text-xs text-ink-500">{managedUser.email}</div>
                        </div>
                        <div className="rounded-full border border-ink-700/80 px-2 py-1 text-[11px] text-ink-400">
                          {managedUser.disabledAt ? "Disabled" : managedUser.subscriptionStatus}
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3 lg:grid-cols-5">
                        <SelectField
                          label="Role"
                          value={managedUser.role}
                          onChange={(value) => void updateManagedUser(managedUser.id, { role: value as "user" | "admin" | "owner" })}
                          options={[
                            { value: "user", label: "User" },
                            { value: "admin", label: "Admin" },
                            { value: "owner", label: "Owner" }
                          ]}
                        />
                        <SelectField
                          label="Hosted plan"
                          value={managedUser.hostedPlan}
                          onChange={(value) => void updateManagedUser(managedUser.id, { hostedPlan: value as "free" | "starter" | "pro" })}
                          options={[
                            { value: "free", label: "Free" },
                            { value: "starter", label: "AI Starter" },
                            { value: "pro", label: "AI Pro" }
                          ]}
                        />
                        <ToggleInline
                          label="Disabled"
                          checked={Boolean(managedUser.disabledAt)}
                          onChange={(checked) => void updateManagedUser(managedUser.id, { disabled: checked })}
                        />
                        <ToggleInline
                          label="Hosted key access"
                          checked={Boolean(managedUser.hostedAccessGrantedAt)}
                          onChange={(checked) => void updateManagedUser(managedUser.id, { hostedAccessGranted: checked })}
                        />
                        <div className="flex items-end">
                          <button
                            onClick={() => void deleteManagedUser(managedUser.id)}
                            disabled={savingAdmin || managedUser.id === user.id}
                            className="w-full rounded-lg border border-danger-400/30 px-3 py-2 text-sm font-medium text-danger-400 hover:bg-danger-400/10 disabled:opacity-50"
                          >
                            Delete user
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel-shell rounded-2xl border border-ink-700/80 p-6">
                <SectionHeading eyebrow="Audit" title="Recent activity" description="Simple local logs for auth, admin, and account changes." />
                <div className="mt-6 space-y-2">
                  {adminData.logs.map((log) => (
                    <div key={log.id} className="rounded-xl border border-ink-700/80 bg-ink-950/35 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium text-ink-200">{log.event}</div>
                        <div className="text-[11px] uppercase tracking-[0.14em] text-ink-500">{log.level}</div>
                      </div>
                      <div className="mt-1 text-xs text-ink-500">{new Date(log.createdAt).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">{eyebrow}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-ink-100">{title}</div>
      <div className="mt-2 text-sm leading-6 text-ink-500">{description}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ink-400">{label}</span>
      {children}
    </label>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ink-700/80 bg-ink-950/35 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">{label}</div>
      <div className="mt-2 text-lg font-semibold text-ink-100">{value}</div>
    </div>
  );
}

function ToggleCard({
  label,
  description,
  checked,
  busy,
  onChange
}: {
  label: string;
  description: string;
  checked: boolean;
  busy: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="rounded-xl border border-ink-700/80 bg-ink-950/35 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-ink-100">{label}</div>
          <div className="mt-1 text-sm leading-6 text-ink-500">{description}</div>
        </div>
        <input type="checkbox" checked={checked} disabled={busy} onChange={(event) => onChange(event.target.checked)} />
      </div>
    </label>
  );
}

function ToggleInline({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex h-full items-center gap-2 rounded-lg border border-ink-700/80 px-3 py-2 text-sm text-ink-300">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 text-xs font-medium text-ink-400">{label}</div>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="control-soft w-full rounded-lg px-3 py-2.5 text-sm outline-none">
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function PlanCard({ title, description, bullets, active }: { title: string; description: string; bullets: string[]; active: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${active ? "border-accent-500/35 bg-accent-500/10" : "border-ink-700/80 bg-ink-950/35"}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-ink-100">{title}</div>
        {active ? <div className="rounded-full border border-accent-500/30 px-2 py-1 text-[11px] font-semibold text-accent-300">Selected</div> : null}
      </div>
      <div className="mt-2 text-sm leading-6 text-ink-500">{description}</div>
      <div className="mt-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">
        <CreditCard className="h-3.5 w-3.5" />
        Included limits
      </div>
      <ul className="mt-3 space-y-2 text-sm text-ink-300">
        {bullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>
    </div>
  );
}

function NoticeBanner({ notice }: { notice: NonNullable<Notice> }) {
  const tone =
    notice.tone === "success"
      ? "border-success-400/25 bg-success-400/10 text-success-400"
      : notice.tone === "error"
        ? "border-danger-400/25 bg-danger-400/10 text-danger-400"
        : "border-accent-500/25 bg-accent-500/10 text-accent-300";
  return <div className={`rounded-xl border px-4 py-3 text-sm shadow-panel ${tone}`}>{notice.message}</div>;
}

function formatBillingStatus(status: BillingState["subscription"]["status"]) {
  switch (status) {
    case "manual":
      return "Manual active";
    case "pending_provider":
      return "Pending payment provider";
    case "inactive":
      return "Inactive";
    case "canceled":
      return "Canceled";
    default:
      return "Free";
  }
}

function formatActivity(kind: StudyActivity["kind"]) {
  switch (kind) {
    case "ask":
      return "Asked notes";
    case "quiz_generated":
      return "Generated quiz";
    case "quiz_checked":
      return "Checked quiz answer";
    case "flashcard_generated":
      return "Generated flashcard";
    case "summary_generated":
      return "Generated summary";
    case "import":
      return "Imported source";
    default:
      return kind;
  }
}

function allowNativeTextShortcuts(event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
  if (!event.ctrlKey && !event.metaKey) return;
  const key = event.key.toLowerCase();
  if (["a", "c", "v", "x", "z", "y"].includes(key)) event.stopPropagation();
}
