"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Download, KeyRound, LogOut, Palette, Save, Sparkles, User2, Activity, Zap, BarChart3, Users, Settings, Lock } from "lucide-react";
import { type KeyboardEvent, type ReactNode, useEffect, useState } from "react";
import type { AdminUserSummary, AiUsage, AuditLog, ProviderSettings, RuntimeSettings, StudyActivity } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const FEATURE_LABELS: Record<string, string> = {
  ask: "Ask queries",
  quiz: "Knowledge Checks",
  flashcards: "Training Cards",
  summary: "Briefings",
  ocr: "OCR scans",
  index: "Index operations"
};

function computeResetDate(): string {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return next.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

type AccountUser = {
  id: string;
  email: string;
  name: string;
};

type Notice = {
  tone: "success" | "error" | "info";
  message: string;
} | null;

type Section = "profile" | "appearance" | "ai" | "security" | "backup" | "admin";
type AppTheme = "purple" | "midnight" | "light";

export function AccountPage({
  user,
  initialSettings,
  initialAdmin,
  initialActivity
}: {
  user: AccountUser;
  initialSettings: ProviderSettings;
  initialAdmin: { runtime: RuntimeSettings; users: AdminUserSummary[]; logs: AuditLog[] } | null;
  initialActivity: StudyActivity[];
}) {
  const [section, setSection] = useState<Section>("ai");
  const [settings, setSettings] = useState(initialSettings);
  const [embeddingModel, setEmbeddingModel] = useState(initialSettings.embeddingModel);
  const [answerModel, setAnswerModel] = useState(initialSettings.answerModel);
  const [visionModel, setVisionModel] = useState(initialSettings.visionModel ?? "");
  const [adminData, setAdminData] = useState(initialAdmin);
  const [activity] = useState(initialActivity);
  const [profileName, setProfileName] = useState(user.name);
  const [profileEmail, setProfileEmail] = useState(user.email);
  const [confirmedEmail, setConfirmedEmail] = useState(user.email);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [emailCode, setEmailCode] = useState("");
  const [confirmingEmail, setConfirmingEmail] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
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

  function pushNotice(message: string, tone: NonNullable<Notice>["tone"]) {
    setNotice({ message, tone });
    window.setTimeout(() => {
      setNotice((current) => (current?.message === message ? null : current));
    }, 3200);
  }

  async function saveProfile() {
    setSavingProfile(true);
    try {
      const response = await fetch("/api/account", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: profileName.trim(), email: profileEmail.trim() })
      });
      const body = (await response.json().catch(() => ({}))) as { name?: string; email?: string; pendingEmail?: string; debugCode?: string; error?: string };
      if (!response.ok) throw new Error(body.error || "Unable to save profile");
      if (body.name) setProfileName(body.name);
      if (body.pendingEmail) {
        setPendingEmail(body.pendingEmail);
        setEmailCode("");
        const msg = body.debugCode
          ? `Verification code sent (dev mode): ${body.debugCode}`
          : `Verification code sent to ${body.pendingEmail}`;
        pushNotice(msg, "info");
      } else {
        pushNotice("Profile updated", "success");
      }
    } catch (error) {
      pushNotice(error instanceof Error ? error.message : "Unable to save profile", "error");
    } finally {
      setSavingProfile(false);
    }
  }

  async function confirmEmailChange() {
    setConfirmingEmail(true);
    try {
      const response = await fetch("/api/account/confirm-email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: emailCode.trim() })
      });
      const body = (await response.json().catch(() => ({}))) as { email?: string; error?: string };
      if (!response.ok) throw new Error(body.error || "Unable to confirm email");
      if (body.email) { setProfileEmail(body.email); setConfirmedEmail(body.email); }
      setPendingEmail(null);
      setEmailCode("");
      pushNotice("Email address updated", "success");
    } catch (error) {
      pushNotice(error instanceof Error ? error.message : "Unable to confirm email", "error");
    } finally {
      setConfirmingEmail(false);
    }
  }

  async function saveSettings() {
    setSavingSettings(true);
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ embeddingModel, answerModel, visionModel })
      });
      const body = (await response.json().catch(() => ({}))) as ProviderSettings & { error?: string };
      if (!response.ok) throw new Error(body.error || "Unable to save settings");
      setSettings(body as ProviderSettings);
      setEmbeddingModel(body.embeddingModel);
      setAnswerModel(body.answerModel);
      setVisionModel(body.visionModel ?? "");
      pushNotice("Settings saved", "success");
    } catch (error) {
      pushNotice(error instanceof Error ? error.message : "Unable to save settings", "error");
    } finally {
      setSavingSettings(false);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sectionParam = params.get("section") as Section | null;
    if (sectionParam) setSection(sectionParam);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  async function updateManagedUser(targetUserId: string, input: { role?: "user" | "admin" | "owner"; disabled?: boolean }) {
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
      {/* Top bar */}
      <div className="relative border-b border-ink-750/50 bg-ink-950/70 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <Link href="/" className="inline-flex items-center gap-2 text-xs font-medium text-ink-500 transition-colors hover:text-ink-300">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to workspace
            </Link>
            <div className="mt-2 text-2xl font-bold tracking-tight text-ink-100">Account</div>
            <div className="mt-0.5 text-sm text-ink-500">Manage your profile, AI models, and settings.</div>
          </div>
          <Button
            onClick={signOut}
            disabled={signingOut}
            loading={signingOut}
            variant="soft"
            size="md"
            leftIcon={!signingOut ? <LogOut className="h-4 w-4" /> : undefined}
          >
            Sign out
          </Button>
        </div>
      </div>

      <div className="relative mx-auto grid w-full max-w-[1440px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* Sidebar */}
        <aside className="h-fit rounded-3xl border border-ink-750/55 bg-ink-925/60 p-3 shadow-[0_18px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl lg:sticky lg:top-6">
          {/* User card */}
          <div className="relative overflow-hidden rounded-2xl border border-ink-750/50 bg-ink-950/15 p-4">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgb(var(--accent-500)/0.16),transparent_55%),radial-gradient(circle_at_80%_40%,rgb(var(--accent-400)/0.10),transparent_60%)]" />
            <div className="relative flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-accent-400/25 bg-accent-500/12 text-sm font-bold text-ink-100">
                {initials}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-ink-100">{user.name}</div>
                <div className="truncate text-xs text-ink-400">{user.email}</div>
              </div>
            </div>
            <div className="relative mt-3 flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-success-400" />
              <span className="text-xs text-ink-500">Free forever</span>
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
                      : "text-ink-400 hover:bg-ink-950/25 hover:text-ink-200"
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-xl border border-accent-400/25 bg-accent-500/10"
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
                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-ink-400">Display name</label>
                        <Input
                          type="text"
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          maxLength={80}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-ink-400">Email address</label>
                        <Input
                          type="email"
                          value={profileEmail}
                          onChange={(e) => setProfileEmail(e.target.value)}
                        />
                      </div>
                    </div>
                    {pendingEmail && (
                      <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                        <p className="text-sm text-amber-300 font-medium">Verify your new email</p>
                        <p className="mt-1 text-xs text-ink-400">We sent a 6-digit code to <span className="text-ink-200">{pendingEmail}</span>. Enter it below to confirm the change.</p>
                        <div className="mt-3 flex gap-2">
                          <Input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="000000"
                            value={emailCode}
                            onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, ""))}
                            className="w-32 text-center font-mono tracking-widest"
                          />
                          <Button
                            onClick={confirmEmailChange}
                            disabled={emailCode.length < 6}
                            loading={confirmingEmail}
                            variant="primary"
                          >
                            Confirm
                          </Button>
                          <button
                            onClick={() => { setPendingEmail(null); setEmailCode(""); setProfileEmail(confirmedEmail); }}
                            className="rounded-xl px-3 py-2 text-sm text-ink-500 transition hover:text-ink-300"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="mt-4 flex justify-end">
                      <Button
                        onClick={saveProfile}
                        disabled={!!pendingEmail || !profileName.trim() || !profileEmail.trim()}
                        loading={savingProfile}
                        variant="primary"
                        leftIcon={!savingProfile ? <Save className="h-4 w-4" /> : undefined}
                      >
                        Save changes
                      </Button>
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
                            className="flex items-start justify-between gap-3 rounded-xl border border-graphite-rail bg-black/20 px-3 py-2.5"
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
                              : "border-graphite-rail hover:border-graphite-rail hover:bg-graphite-rail/10"
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
                <>
                  <GlassPanel>
                    <SectionHeading
                      eyebrow="AI setup"
                      title="Model settings"
                      icon={<Sparkles className="h-5 w-5" />}
                      description="Configure the Ollama models used for AI features on this instance."
                    />

                    <div className="mt-5 rounded-xl border border-accent-500/25 bg-accent-500/8 px-4 py-3 text-sm leading-6 text-accent-300">
                      <div className="flex items-center gap-2">
                        <Zap className="h-3.5 w-3.5 shrink-0" />
                        AI runs via Ollama on this server. All features are free — no API keys or quotas.
                      </div>
                    </div>

                    <div className="mt-6 space-y-4">
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
                            placeholder="moondream"
                            onKeyDown={allowNativeTextShortcuts}
                            onChange={(event) => setVisionModel(event.target.value)}
                            className="control-soft w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                          />
                        </Field>
                      </div>

                      <PrimaryButton onClick={saveSettings} disabled={savingSettings} loading={savingSettings} icon={<Save className="h-4 w-4" />}>
                        {savingSettings ? "Saving..." : "Save AI settings"}
                      </PrimaryButton>
                    </div>
                  </GlassPanel>

                  <GlassPanel>
                    <SectionHeading
                      eyebrow="Usage"
                      title="This month's activity"
                      icon={<BarChart3 className="h-5 w-5" />}
                      description={`Resets on ${computeResetDate()}. For admin visibility only — no limits enforced.`}
                    />
                    <div className="mt-6 space-y-2">
                      {settings.usage.map((u) => (
                        <UsageBar key={u.feature} {...u} label={FEATURE_LABELS[u.feature] ?? u.feature} />
                      ))}
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
                    <div className="mt-6 rounded-xl border border-graphite-rail bg-black/20 p-4 text-sm leading-6 text-ink-400">
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
                        {deletingAccount ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-danger-400/30 border-t-danger-400" /> : null}
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
                      description="Manage roles and account access."
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
                            className="overflow-hidden rounded-xl border border-graphite-rail bg-black/20"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-graphite-rail">
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
                                  : "border-graphite-rail text-ink-400"
                              }`}>
                                {managedUser.disabledAt ? "Disabled" : managedUser.role}
                              </div>
                            </div>

                            <div className="grid gap-3 px-4 py-3 lg:grid-cols-3">
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
                              <ToggleInline
                                label="Disabled"
                                checked={Boolean(managedUser.disabledAt)}
                                onChange={(checked) => void updateManagedUser(managedUser.id, { disabled: checked })}
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
                          className="flex items-center justify-between gap-3 rounded-xl border border-graphite-rail bg-black/20 px-4 py-2.5"
                        >
                          <div>
                            <div className="text-sm font-medium text-ink-200">{log.event}</div>
                            <div className="mt-0.5 text-xs text-ink-500">{new Date(log.createdAt).toLocaleString()}</div>
                          </div>
                          <div className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                            log.level === "warn" || log.level === "error"
                              ? "border-amber-400/25 text-amber-400"
                              : "border-graphite-rail text-ink-500"
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
    <div className="rounded-3xl border border-ink-750/55 bg-ink-925/70 p-6 shadow-[0_18px_70px_rgba(0,0,0,0.34)] backdrop-blur-xl">
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

function PillToggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 shrink-0 rounded-full border transition-colors ${
        checked ? "border-accent-400/40 bg-accent-500/70" : "border-ink-750/55 bg-ink-900/40"
      } disabled:opacity-50`}
    >
      <motion.div
        className="absolute top-0.5 h-4 w-4 rounded-full bg-ink-100 shadow-sm"
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
    <div className="rounded-xl border border-graphite-rail bg-black/20 p-4">
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
    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-graphite-rail bg-black/20 px-3 py-2 text-sm text-ink-300">
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
    <Button
      onClick={onClick}
      disabled={disabled}
      loading={loading}
      leftIcon={!loading ? icon : undefined}
      variant="primary"
    >
      {children}
    </Button>
  );
}

function NoticeBanner({ notice }: { notice: NonNullable<Notice> }) {
  const styles = {
    success: "border-success-400/22 bg-success-400/10 text-success-200",
    error: "border-danger-400/22 bg-danger-400/10 text-danger-200",
    info: "border-accent-400/22 bg-accent-500/10 text-ink-200"
  };
  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm font-medium ${styles[notice.tone]}`}>
      {notice.message}
    </div>
  );
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

function UsageBar({ label, used }: AiUsage & { label: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-ink-750/55 bg-ink-950/15 px-4 py-3">
      <span className="text-sm text-ink-300">{label}</span>
      <span className="text-xs text-ink-500">{used.toLocaleString()} this month</span>
    </div>
  );
}

function allowNativeTextShortcuts(event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
  if (!event.ctrlKey && !event.metaKey) return;
  const key = event.key.toLowerCase();
  if (["a", "c", "v", "x", "z", "y"].includes(key)) event.stopPropagation();
}
