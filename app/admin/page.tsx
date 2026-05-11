"use client";

import { useEffect, useState, useCallback } from "react";
import type { AdminUserSummary, AuditLog, RuntimeSettings, UserFeedback } from "@/lib/types";

type UsageRow = { period: string; feature: string; total: number };
type PerUserRow = { user_id: string; name: string; email: string; feature: string; count: number };
type NoteCountRow = { user_id: string; note_count: number; chunk_count: number };
type Section = "overview" | "users" | "usage" | "feedback" | "audit" | "settings";

type AdminPayload = {
  runtime: RuntimeSettings;
  users: AdminUserSummary[];
  logs: AuditLog[];
  usageByPeriod: UsageRow[];
  currentPeriodPerUser: PerUserRow[];
  noteCounts: NoteCountRow[];
  periods: string[];
};

const features = ["ask", "quiz", "flashcards", "summary", "ocr", "index"] as const;
type Feature = typeof features[number];
const featureLabel: Record<Feature, string> = {
  ask: "Ask", quiz: "Quiz", flashcards: "Flashcards", summary: "Summary", ocr: "OCR", index: "Index"
};

const navItems: { id: Section; label: string; icon: string }[] = [
  { id: "overview",  label: "Overview",   icon: "⊞" },
  { id: "users",     label: "Users",      icon: "👤" },
  { id: "usage",     label: "Usage",      icon: "📊" },
  { id: "feedback",  label: "Feedback",   icon: "💬" },
  { id: "audit",     label: "Audit Log",  icon: "📋" },
  { id: "settings",  label: "Settings",   icon: "⚙️" },
];

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-ink-700/80 bg-ink-900 p-5">
      <div className="text-xs font-semibold uppercase tracking-widest text-ink-500">{label}</div>
      <div className={`mt-2 text-3xl font-bold tabular-nums ${accent ? "text-accent-300" : "text-ink-100"}`}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      {sub ? <div className="mt-1 text-xs text-ink-500">{sub}</div> : null}
    </div>
  );
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      disabled={disabled}
      onClick={onChange}
      className={`relative h-6 w-11 rounded-full transition-colors ${checked ? "bg-accent-500" : "bg-ink-700"} disabled:opacity-50`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

export default function AdminPage() {
  const [section, setSection] = useState<Section>("overview");
  const [data, setData] = useState<AdminPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<UserFeedback[]>([]);
  const [purgingLogs, setPurgingLogs] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin");
    if (res.status === 401) { window.location.href = "/auth"; return; }
    if (res.status === 403) { setError("Admin access required."); return; }
    if (!res.ok) { setError("Failed to load admin data."); return; }
    setData(await res.json() as AdminPayload);
    const fbRes = await fetch("/api/feedback");
    if (fbRes.ok) setFeedback(((await fbRes.json()) as { feedback: UserFeedback[] }).feedback);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function toggleSetting(key: keyof RuntimeSettings) {
    if (!data) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ [key]: !data.runtime[key] })
      });
      if (res.ok) setData((d) => d ? { ...d, runtime: { ...d.runtime, [key]: !d.runtime[key] } } : d);
    } finally { setSaving(false); }
  }

  async function userAction(userId: string, patch: Record<string, unknown>) {
    setActionBusy(userId);
    try {
      await fetch(`/api/admin/users/${userId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) });
      await load();
    } finally { setActionBusy(null); }
  }

  async function deleteUser(userId: string, name: string) {
    if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    setActionBusy(userId);
    try {
      await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      await load();
    } finally { setActionBusy(null); }
  }

  async function purgeLogs() {
    if (!confirm("Delete all audit logs older than 90 days?")) return;
    setPurgingLogs(true);
    try {
      await fetch("/api/admin", { method: "DELETE" });
      await load();
    } finally { setPurgingLogs(false); }
  }

  if (error) return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 text-ink-300">
      <div className="rounded-2xl border border-ink-700 bg-ink-900 p-8 text-center">
        <div className="mb-2 text-lg font-semibold text-danger-400">{error}</div>
        <a href="/" className="text-sm text-accent-300 underline">Go home</a>
      </div>
    </div>
  );

  // ── Derived data ──────────────────────────────────────────────────────────
  const usageMap = new Map<string, Map<string, number>>();
  const grandTotals = new Map<string, number>();
  const perUserMap = new Map<string, { name: string; email: string; features: Map<string, number> }>();
  const noteCountMap = new Map<string, { noteCount: number; chunkCount: number }>();

  if (data) {
    for (const row of data.usageByPeriod) {
      if (!usageMap.has(row.period)) usageMap.set(row.period, new Map());
      usageMap.get(row.period)!.set(row.feature, row.total);
      grandTotals.set(row.feature, (grandTotals.get(row.feature) ?? 0) + row.total);
    }
    for (const row of data.currentPeriodPerUser) {
      if (!perUserMap.has(row.user_id)) perUserMap.set(row.user_id, { name: row.name, email: row.email, features: new Map() });
      perUserMap.get(row.user_id)!.features.set(row.feature, row.count);
    }
    for (const row of data.noteCounts) {
      noteCountMap.set(row.user_id, { noteCount: row.note_count, chunkCount: row.chunk_count });
    }
  }

  const currentPeriod = data?.periods[0] ?? "";
  const totalNotes = data ? data.noteCounts.reduce((s, r) => s + r.note_count, 0) : 0;
  const totalChunks = data ? data.noteCounts.reduce((s, r) => s + r.chunk_count, 0) : 0;

  // ── Layout ────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-ink-950 text-ink-100">

      {/* Sidebar */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-ink-700/60 bg-ink-950/95">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-ink-700/40">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent-500">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M3 3h4v10H3zM9 3h4v4H9zM9 9h4v4H9z" fill="white" fillOpacity="0.9" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-bold text-ink-100">EternalNotes</div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-accent-400">Admin</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 px-3 py-4">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                section === item.id
                  ? "bg-accent-500/15 text-accent-200"
                  : "text-ink-400 hover:bg-ink-800/60 hover:text-ink-100"
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
              {item.id === "feedback" && feedback.length > 0 ? (
                <span className="ml-auto rounded-full bg-accent-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-accent-300">
                  {feedback.length}
                </span>
              ) : null}
            </button>
          ))}
        </nav>

        {/* Footer actions */}
        <div className="space-y-1 border-t border-ink-700/40 px-3 py-4">
          <button
            onClick={() => void load()}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-ink-500 hover:bg-ink-800/60 hover:text-ink-200 transition-colors"
          >
            ↻ Refresh
          </button>
          <a
            href="/api/backup"
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-ink-500 hover:bg-ink-800/60 hover:text-ink-200 transition-colors"
          >
            ↓ Download backup
          </a>
          <a
            href="/"
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-ink-500 hover:bg-ink-800/60 hover:text-ink-200 transition-colors"
          >
            ← Back to app
          </a>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-8 py-8 space-y-8">

          {/* ── OVERVIEW ── */}
          {section === "overview" && (
            <>
              <div>
                <h1 className="text-2xl font-bold text-ink-100">Overview</h1>
                <p className="mt-1 text-sm text-ink-400">
                  {data ? `${data.users.length} user${data.users.length !== 1 ? "s" : ""} registered` : "Loading…"}
                </p>
              </div>

              {!data ? (
                <div className="text-sm text-ink-500">Loading data…</div>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard label="Total users" value={data.users.length} />
                    <StatCard label="Total notes" value={totalNotes} />
                    <StatCard label="Indexed chunks" value={totalChunks} />
                    <StatCard label="Feedback" value={feedback.length} accent={feedback.length > 0} />
                  </div>

                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* Recent audit events */}
                    <div>
                      <div className="mb-3 flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-ink-300">Recent activity</h2>
                        <button onClick={() => setSection("audit")} className="text-xs text-accent-400 hover:text-accent-300">View all →</button>
                      </div>
                      <div className="divide-y divide-ink-800 rounded-2xl border border-ink-700/80 bg-ink-900">
                        {data.logs.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-ink-500">No events yet.</div>
                        ) : data.logs.slice(0, 6).map((log) => (
                          <div key={log.id} className="flex items-start gap-3 px-4 py-3">
                            <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${log.level === "error" ? "bg-danger-400/10 text-danger-400" : log.level === "warn" ? "bg-amber-400/10 text-amber-400" : "bg-ink-700/80 text-ink-400"}`}>
                              {log.level}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-xs text-ink-300">{log.event}</div>
                              <div className="text-[10px] text-ink-600">{log.createdAt.slice(0, 16).replace("T", " ")}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Latest feedback */}
                    <div>
                      <div className="mb-3 flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-ink-300">Latest feedback</h2>
                        <button onClick={() => setSection("feedback")} className="text-xs text-accent-400 hover:text-accent-300">View all →</button>
                      </div>
                      <div className="divide-y divide-ink-800 rounded-2xl border border-ink-700/80 bg-ink-900">
                        {feedback.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-ink-500">No feedback yet.</div>
                        ) : feedback.slice(0, 4).map((item) => (
                          <div key={item.id} className="px-4 py-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.category === "bug" ? "bg-danger-400/15 text-danger-400" : item.category === "feature" ? "bg-accent-500/15 text-accent-300" : "bg-ink-700 text-ink-400"}`}>
                                {item.category === "bug" ? "Bug" : item.category === "feature" ? "Feature" : "General"}
                              </span>
                              <span className="text-xs text-ink-400">{item.name}</span>
                              <span className="ml-auto text-[10px] text-ink-600">{item.createdAt.slice(0, 10)}</span>
                            </div>
                            <p className="text-xs text-ink-400 line-clamp-2">{item.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Quick settings */}
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-ink-300">Quick settings</h2>
                      <button onClick={() => setSection("settings")} className="text-xs text-accent-400 hover:text-accent-300">Manage →</button>
                    </div>
                    <div className="flex gap-3 flex-wrap">
                      {([
                        ["selfSignupEnabled", "Self-signup"],
                        ["emailVerificationEnabled", "Email verification"],
                      ] as [keyof RuntimeSettings, string][]).map(([key, label]) => (
                        <div key={key} className="flex items-center gap-3 rounded-xl border border-ink-700/80 bg-ink-900 px-4 py-3">
                          <span className="text-sm text-ink-300">{label}</span>
                          <Toggle checked={data.runtime[key]} onChange={() => void toggleSetting(key)} disabled={saving} />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* ── USERS ── */}
          {section === "users" && (
            <>
              <div>
                <h1 className="text-2xl font-bold text-ink-100">Users</h1>
                <p className="mt-1 text-sm text-ink-400">{data?.users.length ?? 0} registered</p>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-ink-700/80 bg-ink-900">
                <table className="w-full text-sm">
                  <thead className="border-b border-ink-700 bg-ink-850/60">
                    <tr>
                      {["User", "Role", "Notes", "Verified", "Joined", "Actions"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-800">
                    {(data?.users ?? []).map((u) => {
                      const nc = noteCountMap.get(u.id);
                      return (
                        <tr key={u.id} className={u.disabledAt ? "opacity-40" : ""}>
                          <td className="px-4 py-3">
                            <div className="font-medium text-ink-100">{u.name}</div>
                            <div className="text-xs text-ink-500">{u.email}</div>
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={u.role}
                              disabled={!!actionBusy}
                              onChange={(e) => void userAction(u.id, { role: e.target.value })}
                              className="rounded-lg bg-ink-800 px-2 py-1 text-xs border border-ink-700"
                            >
                              <option value="user">user</option>
                              <option value="admin">admin</option>
                              <option value="owner">owner</option>
                            </select>
                          </td>
                          <td className="px-4 py-3 text-xs tabular-nums text-ink-400">
                            {nc ? <><span className="text-ink-200">{nc.noteCount.toLocaleString()}</span> <span className="text-ink-600">/ {nc.chunkCount.toLocaleString()} chunks</span></> : "—"}
                          </td>
                          <td className="px-4 py-3">
                            {u.emailVerifiedAt
                              ? <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400">Yes</span>
                              : <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-400">No</span>}
                          </td>
                          <td className="px-4 py-3 text-xs text-ink-500">{u.createdAt.slice(0, 10)}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button
                                disabled={!!actionBusy}
                                onClick={() => void userAction(u.id, { disabled: !u.disabledAt })}
                                className="rounded-lg border border-ink-700 px-2.5 py-1 text-xs font-medium text-ink-400 hover:border-amber-400/50 hover:text-amber-400 transition-colors"
                              >
                                {u.disabledAt ? "Enable" : "Disable"}
                              </button>
                              <button
                                disabled={!!actionBusy}
                                onClick={() => void deleteUser(u.id, u.name)}
                                className="rounded-lg border border-ink-700 px-2.5 py-1 text-xs font-medium text-ink-400 hover:border-danger-400/50 hover:text-danger-400 transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── USAGE ── */}
          {section === "usage" && (
            <>
              <div>
                <h1 className="text-2xl font-bold text-ink-100">Feature usage</h1>
                <p className="mt-1 text-sm text-ink-400">Last 6 months</p>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-ink-700/80 bg-ink-900">
                <table className="w-full text-sm">
                  <thead className="border-b border-ink-700 bg-ink-850/60">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-400">Period</th>
                      {features.map((f) => <th key={f} className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-ink-400">{featureLabel[f]}</th>)}
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-ink-400">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-800">
                    {(data?.periods ?? []).map((period) => {
                      const row = usageMap.get(period);
                      const rowTotal = features.reduce((s, f) => s + (row?.get(f) ?? 0), 0);
                      const isCurrent = period === currentPeriod;
                      return (
                        <tr key={period} className={isCurrent ? "bg-accent-500/5" : ""}>
                          <td className="px-4 py-3 font-mono text-xs text-ink-200">
                            {period}
                            {isCurrent ? <span className="ml-2 rounded-full bg-accent-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-accent-300">current</span> : null}
                          </td>
                          {features.map((f) => {
                            const count = row?.get(f) ?? 0;
                            return <td key={f} className={`px-4 py-3 text-right tabular-nums ${count > 0 ? "text-ink-100" : "text-ink-600"}`}>{count > 0 ? count.toLocaleString() : "—"}</td>;
                          })}
                          <td className="px-4 py-3 text-right font-semibold tabular-nums text-ink-100">{rowTotal > 0 ? rowTotal.toLocaleString() : "—"}</td>
                        </tr>
                      );
                    })}
                    <tr className="border-t-2 border-ink-600 bg-ink-850/40">
                      <td className="px-4 py-3 text-xs font-semibold text-ink-300">6-month total</td>
                      {features.map((f) => (
                        <td key={f} className="px-4 py-3 text-right font-semibold tabular-nums text-ink-200">{(grandTotals.get(f) ?? 0).toLocaleString() || "—"}</td>
                      ))}
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-accent-300">
                        {features.reduce((s, f) => s + (grandTotals.get(f) ?? 0), 0).toLocaleString() || "—"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {perUserMap.size > 0 ? (
                <div className="overflow-x-auto rounded-2xl border border-ink-700/80 bg-ink-900">
                  <div className="border-b border-ink-700 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-ink-400">
                    Per-user — {currentPeriod}
                  </div>
                  <table className="w-full text-sm">
                    <thead className="border-b border-ink-700 bg-ink-850/40">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-ink-400">User</th>
                        {features.map((f) => <th key={f} className="px-4 py-3 text-right text-xs font-semibold text-ink-400">{featureLabel[f]}</th>)}
                        <th className="px-4 py-3 text-right text-xs font-semibold text-ink-400">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-800">
                      {[...perUserMap.entries()].map(([userId, { name, email, features: fMap }]) => {
                        const total = features.reduce((s, f) => s + (fMap.get(f) ?? 0), 0);
                        return (
                          <tr key={userId}>
                            <td className="px-4 py-3">
                              <div className="text-sm font-medium text-ink-100">{name}</div>
                              <div className="text-xs text-ink-500">{email}</div>
                            </td>
                            {features.map((f) => {
                              const count = fMap.get(f) ?? 0;
                              return <td key={f} className={`px-4 py-3 text-right tabular-nums ${count > 0 ? "text-ink-100" : "text-ink-600"}`}>{count > 0 ? count.toLocaleString() : "—"}</td>;
                            })}
                            <td className="px-4 py-3 text-right font-semibold tabular-nums text-accent-300">{total.toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-xl border border-ink-700/60 bg-ink-900/50 px-4 py-3 text-sm text-ink-500">No usage recorded this month.</div>
              )}
            </>
          )}

          {/* ── FEEDBACK ── */}
          {section === "feedback" && (
            <>
              <div>
                <h1 className="text-2xl font-bold text-ink-100">Feedback</h1>
                <p className="mt-1 text-sm text-ink-400">{feedback.length} submission{feedback.length !== 1 ? "s" : ""}</p>
              </div>
              <div className="divide-y divide-ink-800 rounded-2xl border border-ink-700/80 bg-ink-900">
                {feedback.length === 0 ? (
                  <div className="px-5 py-6 text-sm text-ink-500">No feedback submitted yet.</div>
                ) : feedback.map((item) => (
                  <div key={item.id} className="px-5 py-4">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${item.category === "bug" ? "bg-danger-400/15 text-danger-400" : item.category === "feature" ? "bg-accent-500/15 text-accent-300" : "bg-ink-700 text-ink-300"}`}>
                        {item.category === "bug" ? "Bug report" : item.category === "feature" ? "Feature request" : "General"}
                      </span>
                      <span className="text-sm font-medium text-ink-200">{item.name}</span>
                      <span className="text-xs text-ink-500">{item.email}</span>
                      <span className="ml-auto text-xs text-ink-500">{item.createdAt.slice(0, 16).replace("T", " ")}</span>
                    </div>
                    <p className="text-sm text-ink-300 whitespace-pre-wrap">{item.message}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── AUDIT LOG ── */}
          {section === "audit" && (
            <>
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-ink-100">Audit Log</h1>
                  <p className="mt-1 text-sm text-ink-400">Last {data?.logs.length ?? 0} events</p>
                </div>
                <button
                  onClick={() => void purgeLogs()}
                  disabled={purgingLogs}
                  className="rounded-xl border border-ink-700 px-4 py-2 text-sm font-medium text-ink-400 hover:border-amber-400/50 hover:text-amber-400 transition-colors disabled:opacity-50"
                >
                  {purgingLogs ? "Purging…" : "Purge logs > 90 days"}
                </button>
              </div>
              <div className="divide-y divide-ink-800 rounded-2xl border border-ink-700/80 bg-ink-900">
                {(data?.logs ?? []).length === 0 ? (
                  <div className="px-5 py-6 text-sm text-ink-500">No audit events yet.</div>
                ) : (data?.logs ?? []).map((log) => (
                  <div key={log.id} className="flex items-start gap-4 px-5 py-3">
                    <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold ${log.level === "error" ? "bg-danger-400/10 text-danger-400" : log.level === "warn" ? "bg-amber-400/10 text-amber-400" : "bg-ink-700/80 text-ink-300"}`}>
                      {log.level}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-ink-200">{log.event}</div>
                      {log.metadataJson ? <div className="mt-0.5 truncate text-xs text-ink-500">{log.metadataJson}</div> : null}
                    </div>
                    <div className="shrink-0 text-xs text-ink-500">{log.createdAt.slice(0, 16).replace("T", " ")}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── SETTINGS ── */}
          {section === "settings" && (
            <>
              <div>
                <h1 className="text-2xl font-bold text-ink-100">Settings</h1>
                <p className="mt-1 text-sm text-ink-400">Runtime controls for this instance</p>
              </div>
              <div className="divide-y divide-ink-800 rounded-2xl border border-ink-700/80 bg-ink-900">
                {([
                  ["selfSignupEnabled", "Self-signup", "Allow new users to register accounts"],
                  ["emailVerificationEnabled", "Email verification", "Require email verification before users can sign in"],
                ] as [keyof RuntimeSettings, string, string][]).map(([key, label, desc]) => (
                  <div key={key} className="flex items-center justify-between px-5 py-4">
                    <div>
                      <div className="text-sm font-medium text-ink-200">{label}</div>
                      <div className="text-xs text-ink-500">{desc}</div>
                    </div>
                    <Toggle checked={data?.runtime[key] ?? false} onChange={() => void toggleSetting(key)} disabled={saving} />
                  </div>
                ))}
              </div>
            </>
          )}

        </div>
      </main>
    </div>
  );
}
