"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, CreditCard, Download, KeyRound, Loader2, LogOut, Palette, Save, Sparkles, User2, Activity, Zap, BarChart3, Users, Settings, Lock } from "lucide-react";
import { type KeyboardEvent, type ReactNode, useEffect, useMemo, useState } from "react";
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

type Section = "profile" | "appearance" | "ai" | "billing" | "security" | "backup" | "admin";
type AppTheme = "purple" | "midnight" | "light";

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
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [appTheme, setAppTheme] = useState<AppTheme>(() => {
    try { return (JSON.parse(localStorage.getItem("studyos:theme") ?? '"purple"') as AppTheme) || "purple"; }
    catch { return "purple"; }
  });

  useEffect(() => {
    localStorage.setItem("studyos:theme", JSON.stringify(appTheme));
    document.documentElement.setAttribute("data-theme", appTheme);
  }, [appTheme]);

  const aiStatus = useMemo(() => {
    if (settings.maskedKey) return "Personal key active. AI runs on your own provider account and does not consume hosted quota.";
    if (settings.hostedKeyAvailable && billing.hostedAccessGranted) return `Hosted AI active on the ${billing.subscription.plan} plan.`;
    if (settings.hostedKeyAvailable && !billing.hostedAccessGranted) {
      return "Hosted plan selected, but server-key usage is pending owner approval for this account.";
    }
    return "AI runs via local Ollama if configured on this server, otherwise notes-only mode.";
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

  async function exportData() {
    try {
      const response = await fetch("/api/account/export");
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `eternalnotes-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      pushNotice(error instanceof Error ? error.message : "Export failed", "error");
    }
  }

  async function deleteAccount() {
    setDeletingAccount(true);
    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirm: deleteConfirm })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        pushNotice(body.error || "Deletion failed", "error");
        return;
      }
      window.location.href = "/auth";
    } finally {
      setDeletingAccount(false);
    }
  }

  async function signOut() {
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      window.location.href = "/auth";
    } finally {
      setSigningOut(false);
    }
  }

  const navItems: Array<{ id: Section; label: string; icon: typeof User2 }> = [
    { id: "profile", label: "Profile", icon: User2 },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "ai", label: "AI Settings", icon: Sparkles },
    { id: "billing", label: "Billing", icon: CreditCard },
    { id: "security", label: "Security", icon: Lock },
    ...(initialAdmin ? [{ id: "backup" as const, label: "Backup", icon: Download }] : []),
    ...(initialAdmin ? [{ id: "admin" as const, label: "Admin", icon: Settings }] : [])
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

  const initials = user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <main className="min-h-screen bg-ink-950 text-ink-100">
      {/* Ambient background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/4 top-0 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-accent-500/8 blur-[120px]" />
        <div className="absolute right-1/4 bottom-1/4 h-[400px] w-[600px] rounded-full bg-accent-600/6 blur-[100px]" />
      </div>

      {/* Top bar */}
      <div className="relative border-b border-white/[0.06] bg-ink-950/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <Link href="/" className="inline-flex items-center gap-2 text-xs font-medium text-ink-500 transition-colors hover:text-ink-300">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to workspace
            </Link>
            <div className="mt-2 text-2xl font-bold tracking-tight text-ink-100">Account</div>
            <div className="mt-0.5 text-sm text-ink-500">Manage your profile, AI access, hosted usage, and backups.</div>
          </div>
          <button
            onClick={signOut}
            disabled={signingOut}
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 text-sm font-medium text-ink-300 transition-colors hover:bg-white/[0.07] hover:text-ink-100 disabled:opacity-60"
          >
            {signingOut ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
            Sign out
          </button>
        </div>
      </div>

      <div className="relative mx-auto grid w-full max-w-[1440px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* Sidebar */}
        <aside className="h-fit rounded-2xl border border-white/[0.08] bg-ink-900/60 p-3 shadow-panel backdrop-blur-xl lg:sticky lg:top-6">
          {/* User card */}
          <div className="relative overflow-hidden rounded-xl border border-accent-500/20 bg-gradient-to-br from-accent-500/15 via-accent-600/10 to-transparent p-4">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent-400/5 to-transparent" />
            <div className="relative flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent-500 to-accent-600 text-sm font-bold text-white shadow-glow">
                {initials}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-ink-100">{user.name}</div>
                <div className="truncate text-xs text-ink-400">{user.email}</div>
              </div>
            </div>
            <div className="relative mt-3 flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-success-400" />
              <span className="text-xs text-ink-500">
                {billing.subscription.plan === "free" ? "Personal plan" : "Pro plan"}
              </span>
            </div>
          </div>

          {/* Nav items */}
          <nav className="mt-3 space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setSection(item.id)}
                  className={`relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                    active
                      ? "text-ink-100"
                      : "text-ink-400 hover:bg-white/[0.03] hover:text-ink-200"
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-xl border border-accent-500/25 bg-accent-500/10"
                      transition={{ type: "spring", stiffness: 500, damping: 40 }}
                    />
                  )}
                  <Icon className={`relative h-4 w-4 shrink-0 ${active ? "text-accent-400" : ""}`} />
                  <span className="relative">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <section className="min-w-0 space-y-4">
          {/* Notice banner */}
          <AnimatePresence>
            {notice && (
              <motion.div
                key="notice"
                initial={{ opacity: 0, y: -12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ type: "spring", stiffness: 460, damping: 36 }}
              >
                <NoticeBanner notice={notice} />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div
              key={section}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="space-y-4"
            >
              {/* ─── PROFILE ─── */}
              {section === "profile" && (
                <>
                  <GlassPanel>
                    <SectionHeading eyebrow="Profile" title="Account details" icon={<User2 className="h-5 w-5" />} description="Your identity and account information." />
                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      <MetricCard label="Display name" value={user.name} accent />
                      <MetricCard label="Email address" value={user.email} />
                    </div>
                    <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm leading-6 text-ink-400">
                      The note system stays free. AI usage can run on a personal API key or on a hosted plan backed by the server key if the server owner has configured one.
                    </div>
                  </GlassPanel>

                  <GlassPanel>
                    <div className="flex items-center gap-2 text-xs font-semibold text-ink-500">
                      <Activity className="h-3.5 w-3.5" />
                      Recent activity
                    </div>
                    <div className="mt-4 space-y-2">
                      {activity.length ? (
                        activity.slice(0, 6).map((item, i) => (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.04 }}
                            className="flex items-start justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
                          >
                            <div>
                              <div className="text-sm font-medium text-ink-200">{formatActivity(item.kind)}</div>
                              <div className="mt-0.5 text-xs text-ink-500">
                                {[item.scopeLabel, item.noteTitle].filter(Boolean).join(" · ") || "General activity"}
                              </div>
                            </div>
                            <div className="shrink-0 text-[11px] text-ink-600">{new Date(item.createdAt).toLocaleDateString()}</div>
                          </motion.div>
                        ))
                      ) : (
                        <div className="py-4 text-center text-sm text-ink-500">No activity recorded yet.</div>
                      )}
                    </div>
                  </GlassPanel>
                </>
              )}

              {/* ─── APPEARANCE ─── */}
              {section === "appearance" && (
                <GlassPanel>
                  <SectionHeading eyebrow="Appearance" title="Theme" icon={<Palette className="h-5 w-5" />} description="Choose a colour theme. Your preference is saved locally and applied instantly." />
                  <div className="mt-6 grid gap-4 sm:grid-cols-3">
                    {([
                      {
                        id: "purple" as AppTheme,
                        label: "Purple",
                        description: "Deep purple dark",
                        swatches: ["#0F0D15", "#2D2547", "#8B5CF6", "#C4B5FD"]
                      },
                      {
                        id: "midnight" as AppTheme,
                        label: "Midnight",
                        description: "Neutral dark, blue accent",
                        swatches: ["#09090B", "#27272A", "#3B82F6", "#93C5FD"]
                      },
                      {
                        id: "light" as AppTheme,
                        label: "Light",
                        description: "Clean light, violet accent",
                        swatches: ["#FFFFFF", "#E0DEEE", "#7C3AED", "#6D28D9"]
                      }
                    ] as const).map((t, i) => {
                      const active = appTheme === t.id;
                      return (
                        <motion.button
                          key={t.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.06 }}
                          onClick={() => setAppTheme(t.id)}
                          className={`relative overflow-hidden rounded-xl border-2 p-4 text-left transition-all ${
                            active
                              ? "border-accent-500/60 bg-accent-500/10 shadow-[0_0_24px_rgba(139,92,246,0.15)]"
                              : "border-white/[0.08] hover:border-white/[0.14] hover:bg-white/[0.02]"
                          }`}
                        >
                          {active && (
                            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent-500/8 to-transparent" />
                          )}
                          <div className="relative flex gap-1.5 mb-4">
                            {t.swatches.map((color, idx) => (
                              <div key={idx} className="h-8 flex-1 rounded-lg border border-black/10 shadow-sm" style={{ background: color }} />
                            ))}
                          </div>
                          <div className={`relative text-sm font-semibold ${active ? "text-accent-300" : "text-ink-100"}`}>{t.label}</div>
                          <div className="relative mt-0.5 text-xs text-ink-500">{t.description}</div>
                          {active && (
                            <div className="relative mt-2 inline-flex items-center gap-1 rounded-full border border-accent-500/30 bg-accent-500/15 px-2 py-0.5 text-[11px] font-semibold text-accent-300">
                              Active
                            </div>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </GlassPanel>
              )}

              {/* ─── AI SETTINGS ─── */}
              {section === "ai" && (
                <GlassPanel>
                  <SectionHeading
                    eyebrow="AI setup"
                    title="Provider & model settings"
                    icon={<Sparkles className="h-5 w-5" />}
                    description="BYOK setup and model configuration. Billing and hosted plan selection live separately."
                  />

                  <div className={`mt-5 rounded-xl border px-4 py-3 text-sm leading-6 ${
                    settings.maskedKey
                      ? "border-success-400/25 bg-success-400/8 text-success-300"
                      : billing.subscription.plan !== "free" && billing.hostedAccessGranted
                      ? "border-accent-500/25 bg-accent-500/8 text-accent-300"
                      : "border-white/[0.08] bg-white/[0.03] text-ink-400"
                  }`}>
                    <div className="flex items-center gap-2">
                      <Zap className="h-3.5 w-3.5 shrink-0" />
                      {aiStatus}
                    </div>
                  </div>

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
                      <PillToggleLabel
                        label="Clear saved personal API key and use hosted/local mode instead"
                        checked={clearApiKey}
                        onChange={setClearApiKey}
                      />
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

                    <div className="rounded-xl border border-amber-400/25 bg-amber-400/8 p-4 text-sm leading-6 text-amber-300">
                      MVP local storage writes the personal key to an ignored file under <code>data/secrets</code>. Hosted deployment should replace this with encrypted per-user secret storage.
                    </div>

                    <PrimaryButton onClick={saveSettings} disabled={savingSettings} loading={savingSettings} icon={<Save className="h-4 w-4" />}>
                      {savingSettings ? "Saving..." : "Save AI settings"}
                    </PrimaryButton>
                  </div>
                </GlassPanel>
              )}

              {/* ─── BILLING ─── */}
              {section === "billing" && (
                <>
                  <GlassPanel>
                    <SectionHeading
                      eyebrow="Billing"
                      title="Plan & billing setup"
                      icon={<CreditCard className="h-5 w-5" />}
                      description="View your current plan and billing information."
                    />

                    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                      <div className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <MetricCard label="Current plan" value={billing.subscription.plan === "free" ? "Personal" : "Pro"} accent />
                          <MetricCard label="Status" value={formatBillingStatus(billing.subscription.status)} />
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

                        <Field label={`Plan${settings.hostedKeyAvailable ? "" : " (hosted AI not configured on this server)"}`}>
                          <select
                            value={hostedPlan === "pro" ? "starter" : hostedPlan}
                            onChange={(event) => setHostedPlan(event.target.value as typeof hostedPlan)}
                            className="control-soft w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                          >
                            <option value="free">Personal — Free forever, bring your own key</option>
                            <option value="starter">Pro — $12/mo, hosted AI included</option>
                          </select>
                        </Field>

                        {settings.hostedKeyAvailable && hostedPlan !== "free" ? (
                          <div className={`rounded-xl border p-4 ${billing.hostedAccessGranted ? "border-success-400/25 bg-success-400/8" : "border-white/[0.08] bg-white/[0.02]"}`}>
                            <div className="flex items-center gap-2">
                              <div className={`h-1.5 w-1.5 rounded-full ${billing.hostedAccessGranted ? "bg-success-400" : "bg-ink-500"}`} />
                              <div className="text-xs font-semibold text-ink-500">Hosted key access</div>
                            </div>
                            <div className="mt-2 text-sm leading-6 text-ink-400">
                              {billing.hostedAccessGranted
                                ? "This account is approved to use the server-managed key."
                                : "Not approved yet. Save your hosted plan choice, then the owner can grant access from the admin panel."}
                            </div>
                          </div>
                        ) : null}

                        <PrimaryButton onClick={saveBilling} disabled={savingBilling || !billingEmail.trim()} loading={savingBilling} icon={<Save className="h-4 w-4" />}>
                          {savingBilling ? "Saving..." : "Save billing setup"}
                        </PrimaryButton>
                      </div>

                      <div className="space-y-3">
                        <PlanCard
                          title="Personal"
                          price="$0 / month"
                          active={hostedPlan === "free"}
                          description="Full access to all features. Bring your own OpenAI API key."
                          bullets={["Unlimited documents", "All AI tools (BYOK)", "Team workspaces", "No monthly cost"]}
                        />
                        <PlanCard
                          title="Pro"
                          price="$12 / month"
                          active={hostedPlan === "starter" || hostedPlan === "pro"}
                          description="Everything in Personal plus hosted AI — no API key needed."
                          bullets={["1500 Ask queries / month", "600 Knowledge Checks / month", "600 Training Cards / month", "600 Briefings / month", "200 OCR scans / month", "Team workspaces"]}
                          highlight
                        />
                      </div>
                    </div>
                  </GlassPanel>

                  <GlassPanel>
                    <SectionHeading
                      eyebrow="Features"
                      title="What's included"
                      icon={<BarChart3 className="h-5 w-5" />}
                      description="Pro features are available on the Pro plan or with a personal API key (BYOK)."
                    />
                    <div className="mt-6 grid gap-2 sm:grid-cols-2">
                      {[
                        { label: "Notes & documents", free: true },
                        { label: "Ask (RAG queries)", free: true },
                        { label: "Knowledge indexing", free: true },
                        { label: "Team workspaces", free: true },
                        { label: "Text / PDF / DOCX import", free: true },
                        { label: "Image OCR import", free: false },
                        { label: "Quiz generation", free: false },
                        { label: "Flashcard generation", free: false },
                        { label: "Note summaries", free: false },
                      ].map((feat) => {
                        const userIsPro = billing.subscription.plan !== "free" || !!settings.maskedKey;
                        const unlocked = feat.free || userIsPro;
                        return (
                          <div key={feat.label} className={`flex items-center justify-between rounded-lg border px-3 py-2 ${unlocked ? "border-white/[0.08] bg-white/[0.02]" : "border-white/[0.04] bg-transparent opacity-50"}`}>
                            <span className="text-sm text-ink-300">{feat.label}</span>
                            <span className={`text-[11px] font-semibold ${feat.free ? "text-success-400" : "text-accent-400"}`}>
                              {feat.free ? "Personal" : "Pro"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </GlassPanel>
                </>
              )}

              {/* ─── SECURITY ─── */}
              {section === "security" && (
                <GlassPanel>
                  <SectionHeading eyebrow="Security" title="Password & session" icon={<Lock className="h-5 w-5" />} description="Update your password to keep your account secure." />
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
                  <div className="mt-4">
                    <PrimaryButton
                      onClick={savePassword}
                      disabled={changingPassword || !currentPassword || newPassword.length < 8 || confirmPassword.length < 8}
                      loading={changingPassword}
                      icon={<KeyRound className="h-4 w-4" />}
                    >
                      {changingPassword ? "Updating..." : "Change password"}
                    </PrimaryButton>
                  </div>
                </GlassPanel>
              )}

              {/* ─── BACKUP ─── */}
              {section === "backup" && (
                <>
                  <GlassPanel>
                    <SectionHeading eyebrow="Backup" title="Export database snapshot" icon={<Download className="h-5 w-5" />} description="Download the SQLite database so you can restore notes and indexes later." />
                    <div className="mt-6 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-sm leading-6 text-ink-400">
                      This export includes the database only. Files under <code className="rounded bg-white/[0.06] px-1 py-0.5 text-xs">data/secrets</code> are not included and still need filesystem backup.
                    </div>
                    <div className="mt-4">
                      <PrimaryButton onClick={downloadBackup} disabled={downloadingBackup} loading={downloadingBackup} icon={<Download className="h-4 w-4" />}>
                        {downloadingBackup ? "Preparing backup..." : "Download database backup"}
                      </PrimaryButton>
                    </div>
                  </GlassPanel>

                  <GlassPanel>
                    <SectionHeading eyebrow="Your data" title="Export your notes" icon={<Download className="h-5 w-5" />} description="Download all your notes, folders, and tags as a JSON file." />
                    <div className="mt-4">
                      <PrimaryButton onClick={exportData} icon={<Download className="h-4 w-4" />}>
                        Export my data
                      </PrimaryButton>
                    </div>
                  </GlassPanel>

                  <GlassPanel>
                    <SectionHeading eyebrow="Danger zone" title="Delete account" icon={<User2 className="h-5 w-5" />} description="Permanently delete your account and all associated data. This cannot be undone." />
                    <div className="mt-6 space-y-4">
                      <div className="rounded-xl border border-danger-400/25 bg-danger-400/8 p-4 text-sm leading-6 text-ink-400">
                        This will immediately delete your account, all your notes, documents, and settings. There is no recovery.
                      </div>
                      <Field label={`Type your email to confirm: ${user.email}`}>
                        <input
                          value={deleteConfirm}
                          onChange={(e) => setDeleteConfirm(e.target.value)}
                          onKeyDown={allowNativeTextShortcuts}
                          placeholder={user.email}
                          className="control-soft w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                        />
                      </Field>
                      <button
                        onClick={() => void deleteAccount()}
                        disabled={deletingAccount || deleteConfirm !== user.email}
                        className="flex items-center gap-2 rounded-xl border border-danger-400/40 bg-danger-400/10 px-4 py-2.5 text-sm font-semibold text-danger-400 transition-colors hover:bg-danger-400/20 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {deletingAccount ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        {deletingAccount ? "Deleting…" : "Delete my account"}
                      </button>
                    </div>
                  </GlassPanel>
                </>
              )}

              {/* ─── ADMIN ─── */}
              {section === "admin" && adminData && (
                <>
                  <GlassPanel>
                    <SectionHeading
                      eyebrow="Admin"
                      title="Instance controls"
                      icon={<Settings className="h-5 w-5" />}
                      description="Runtime controls for this self-hosted instance. These persist in the local database."
                    />
                    <div className="mt-6 grid gap-3 sm:grid-cols-3">
                      <ToggleCard
                        label="Self signup"
                        description="Allow new users to register."
                        checked={adminData.runtime.selfSignupEnabled}
                        busy={savingAdmin}
                        onChange={(checked) => void saveAdminRuntime({ selfSignupEnabled: checked })}
                      />
                      <ToggleCard
                        label="Email verification"
                        description="Require email verification before first login."
                        checked={adminData.runtime.emailVerificationEnabled}
                        busy={savingAdmin}
                        onChange={(checked) => void saveAdminRuntime({ emailVerificationEnabled: checked })}
                      />
                    </div>
                  </GlassPanel>

                  <GlassPanel>
                    <SectionHeading
                      eyebrow="Users"
                      title="User management"
                      icon={<Users className="h-5 w-5" />}
                      description="Manage hosted plans, roles, and account access."
                    />
                    <div className="mt-6 space-y-3">
                      {adminData.users.map((managedUser, i) => {
                        const userInitials = managedUser.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
                        const isCurrentUser = managedUser.id === user.id;
                        return (
                          <motion.div
                            key={managedUser.id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04 }}
                            className="overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02]"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-white/[0.05]">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent-500/40 to-accent-600/30 text-xs font-bold text-accent-200">
                                  {userInitials}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <div className="truncate text-sm font-semibold text-ink-100">{managedUser.name}</div>
                                    {isCurrentUser && (
                                      <span className="shrink-0 rounded-full border border-accent-500/30 bg-accent-500/10 px-2 py-0.5 text-[10px] font-semibold text-accent-300">You</span>
                                    )}
                                  </div>
                                  <div className="truncate text-xs text-ink-500">{managedUser.email}</div>
                                </div>
                              </div>
                              <div className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                                managedUser.disabledAt
                                  ? "border-danger-400/30 text-danger-400"
                                  : "border-white/[0.1] text-ink-400"
                              }`}>
                                {managedUser.disabledAt ? "Disabled" : managedUser.subscriptionStatus}
                              </div>
                            </div>

                            <div className="grid gap-3 px-4 py-3 lg:grid-cols-5">
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
                                  { value: "free", label: "Personal" },
                                  { value: "starter", label: "Pro" },
                                  { value: "pro", label: "Pro (legacy)" }
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
                                  disabled={savingAdmin || isCurrentUser}
                                  className="w-full rounded-lg border border-danger-400/25 px-3 py-2 text-sm font-medium text-danger-400 transition-colors hover:bg-danger-400/8 disabled:opacity-40"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </GlassPanel>

                  <GlassPanel>
                    <SectionHeading eyebrow="Audit" title="Recent activity" icon={<Activity className="h-5 w-5" />} description="Simple local logs for auth, admin, and account changes." />
                    <div className="mt-6 space-y-2">
                      {adminData.logs.map((log, i) => (
                        <motion.div
                          key={log.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.025 }}
                          className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-2.5"
                        >
                          <div>
                            <div className="text-sm font-medium text-ink-200">{log.event}</div>
                            <div className="mt-0.5 text-xs text-ink-500">{new Date(log.createdAt).toLocaleString()}</div>
                          </div>
                          <div className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                            log.level === "warn" || log.level === "error"
                              ? "border-amber-400/25 text-amber-400"
                              : "border-white/[0.08] text-ink-500"
                          }`}>
                            {log.level}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </GlassPanel>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </section>
      </div>
    </main>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function GlassPanel({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-ink-900/60 p-6 shadow-panel backdrop-blur-xl">
      {children}
    </div>
  );
}

function SectionHeading({ eyebrow, title, icon, description }: { eyebrow: string; title: string; icon: ReactNode; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-accent-500/25 bg-accent-500/10 text-accent-400">
        {icon}
      </div>
      <div>
        <div className="text-[11px] font-semibold text-ink-500">{eyebrow}</div>
        <div className="mt-0.5 text-xl font-bold tracking-tight text-ink-100">{title}</div>
        <div className="mt-1 text-sm leading-5 text-ink-500">{description}</div>
      </div>
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

function MetricCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`relative overflow-hidden rounded-xl border p-4 ${accent ? "border-accent-500/20 bg-accent-500/8" : "border-white/[0.08] bg-white/[0.02]"}`}>
      {accent && <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-0.5 rounded-l-xl bg-gradient-to-b from-accent-400 to-accent-600" />}
      <div className="text-xs font-medium text-ink-500">{label}</div>
      <div className="mt-1.5 text-base font-semibold text-ink-100 truncate">{value}</div>
    </div>
  );
}

function PillToggleLabel({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2.5">
      <PillToggle checked={checked} onChange={onChange} />
      <span className="text-sm text-ink-300">{label}</span>
    </label>
  );
}

function PillToggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 shrink-0 rounded-full border transition-colors ${
        checked ? "border-accent-500/50 bg-accent-500" : "border-white/[0.15] bg-white/[0.08]"
      } disabled:opacity-50`}
    >
      <motion.div
        className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm"
        animate={{ left: checked ? "calc(100% - 18px)" : "2px" }}
        transition={{ type: "spring", stiffness: 500, damping: 36 }}
      />
    </button>
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
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-ink-100">{label}</div>
          <div className="mt-1 text-xs leading-5 text-ink-500">{description}</div>
        </div>
        <PillToggle checked={checked} onChange={onChange} disabled={busy} />
      </div>
    </div>
  );
}

function ToggleInline({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm text-ink-300">
      <PillToggle checked={checked} onChange={onChange} />
      <span className="text-xs font-medium">{label}</span>
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
      <select value={value} onChange={(event) => onChange(event.target.value)} className="control-soft w-full rounded-lg px-3 py-2 text-sm outline-none">
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function PlanCard({ title, price, description, bullets, active, highlight }: { title: string; price: string; description: string; bullets: string[]; active: boolean; highlight?: boolean }) {
  return (
    <div className={`relative overflow-hidden rounded-xl border p-4 transition-all ${
      active
        ? highlight
          ? "border-accent-500/40 bg-accent-500/10 shadow-[0_0_30px_rgba(139,92,246,0.12)]"
          : "border-accent-500/30 bg-accent-500/8"
        : "border-white/[0.08] bg-white/[0.02]"
    }`}>
      {active && highlight && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent-500/8 to-transparent" />
      )}
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-ink-100">{title}</div>
          <div className="mt-0.5 text-xl font-bold text-accent-300">{price}</div>
        </div>
        {active && (
          <div className="rounded-full border border-accent-500/35 bg-accent-500/15 px-2 py-0.5 text-[11px] font-semibold text-accent-300">
            Selected
          </div>
        )}
      </div>
      <div className="relative mt-2 text-xs leading-5 text-ink-500">{description}</div>
      <ul className="relative mt-3 space-y-1.5">
        {bullets.map((bullet) => (
          <li key={bullet} className="flex items-center gap-2 text-xs text-ink-400">
            <div className="h-1 w-1 shrink-0 rounded-full bg-accent-500/60" />
            {bullet}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PrimaryButton({
  onClick,
  disabled,
  loading,
  icon,
  children
}: {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-accent-500 px-5 text-sm font-semibold text-white shadow-glow transition-all hover:bg-accent-400 hover:-translate-y-px disabled:opacity-60 disabled:transform-none"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}

function NoticeBanner({ notice }: { notice: NonNullable<Notice> }) {
  const styles = {
    success: "border-success-400/25 bg-success-400/10 text-success-300",
    error: "border-danger-400/25 bg-danger-400/10 text-danger-300",
    info: "border-accent-500/25 bg-accent-500/10 text-accent-300"
  };
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm font-medium shadow-panel ${styles[notice.tone]}`}>
      {notice.message}
    </div>
  );
}

function formatBillingStatus(status: BillingState["subscription"]["status"]) {
  switch (status) {
    case "manual": return "Manual active";
    case "pending_provider": return "Pending payment provider";
    case "inactive": return "Inactive";
    case "canceled": return "Canceled";
    default: return "Free";
  }
}

function formatActivity(kind: StudyActivity["kind"]) {
  switch (kind) {
    case "ask": return "Queried knowledge base";
    case "quiz_generated": return "Generated knowledge check";
    case "quiz_checked": return "Checked answer";
    case "flashcard_generated": return "Generated training card";
    case "summary_generated": return "Generated briefing";
    case "import": return "Imported document";
    default: return kind;
  }
}

function allowNativeTextShortcuts(event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
  if (!event.ctrlKey && !event.metaKey) return;
  const key = event.key.toLowerCase();
  if (["a", "c", "v", "x", "z", "y"].includes(key)) event.stopPropagation();
}
