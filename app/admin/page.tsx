"use client";

import { useEffect, useState, useCallback } from "react";
import type { AdminUserSummary, AuditLog, RuntimeSettings, UserFeedback } from "@/lib/types";

type UsageRow = { period: string; feature: string; total: number };
type PerUserRow = { user_id: string; name: string; email: string; feature: string; count: number };
type NoteCountRow = { user_id: string; note_count: number; chunk_count: number };

type AdminPayload = {
  runtime: RuntimeSettings;
  users: AdminUserSummary[];
  logs: AuditLog[];
  usageByPeriod: UsageRow[];
  currentPeriodPerUser: PerUserRow[];
  noteCounts: NoteCountRow[];
  periods: string[];
};

export default function AdminPage() {
  const [data, setData] = useState<AdminPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<UserFeedback[]>([]);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin");
    if (res.status === 401) { window.location.href = "/auth"; return; }
    if (res.status === 403) { setError("Admin access required."); return; }
    if (!res.ok) { setError("Failed to load admin data."); return; }
    setData(await res.json() as AdminPayload);
    const fbRes = await fetch("/api/feedback");
    if (fbRes.ok) {
      const fbData = await fbRes.json() as { feedback: UserFeedback[] };
      setFeedback(fbData.feedback);
    }
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
      await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch)
      });
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

  if (error) return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 text-ink-300">
      <div className="rounded-2xl border border-ink-700 bg-ink-900 p-8 text-center">
        <div className="mb-2 text-lg font-semibold text-danger-400">{error}</div>
        <a href="/" className="text-sm text-accent-300 underline">Go home</a>
      </div>
    </div>
  );

  if (!data) return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 text-ink-400">Loading…</div>
  );

  const { runtime, users, logs, usageByPeriod, currentPeriodPerUser, noteCounts, periods } = data;

  const features = ["ask", "quiz", "flashcards", "summary", "ocr", "index"] as const;
  type Feature = typeof features[number];

  // Build a map: period -> feature -> total
  const usageMap = new Map<string, Map<string, number>>();
  for (const row of usageByPeriod) {
    if (!usageMap.has(row.period)) usageMap.set(row.period, new Map());
    usageMap.get(row.period)!.set(row.feature, row.total);
  }

  // Grand totals per feature across all loaded periods
  const grandTotals = new Map<string, number>();
  for (const row of usageByPeriod) {
    grandTotals.set(row.feature, (grandTotals.get(row.feature) ?? 0) + row.total);
  }

  // Per-user map for current period: user_id → { featureMap, name, email }
  const perUserMap = new Map<string, { name: string; email: string; features: Map<string, number> }>();
  for (const row of currentPeriodPerUser) {
    if (!perUserMap.has(row.user_id)) perUserMap.set(row.user_id, { name: row.name, email: row.email, features: new Map() });
    perUserMap.get(row.user_id)!.features.set(row.feature, row.count);
  }

  // Note/chunk counts per user
  const noteCountMap = new Map<string, { noteCount: number; chunkCount: number }>();
  for (const row of noteCounts) {
    noteCountMap.set(row.user_id, { noteCount: row.note_count, chunkCount: row.chunk_count });
  }

  const featureLabel: Record<Feature, string> = {
    ask: "Ask",
    quiz: "Knowledge Check",
    flashcards: "Training Cards",
    summary: "Briefing",
    ocr: "OCR",
    index: "Index"
  };

  const currentPeriod = periods[0] ?? "";

  return (
    <div className="min-h-screen bg-ink-950 text-ink-100">
      <div className="mx-auto max-w-5xl px-6 py-10 space-y-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Admin dashboard</h1>
            <p className="mt-1 text-sm text-ink-400">{users.length} user{users.length !== 1 ? "s" : ""} registered</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => void load()}
              className="rounded-xl border border-ink-700 px-4 py-2 text-sm font-semibold text-ink-200 hover:border-accent-500/40 hover:text-white"
            >
              Refresh
            </button>
            <a href="/api/backup" className="rounded-xl border border-ink-700 px-4 py-2 text-sm font-semibold text-ink-200 hover:border-accent-500/40 hover:text-white">
              Download backup
            </a>
            <a href="/" className="rounded-xl border border-ink-700 px-4 py-2 text-sm font-semibold text-ink-200 hover:border-accent-500/40 hover:text-white">
              ← Back to app
            </a>
          </div>
        </div>

        {/* Runtime Settings */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-ink-400">Runtime settings</h2>
          <div className="divide-y divide-ink-800 rounded-2xl border border-ink-700 bg-ink-900">
            {([
              ["selfSignupEnabled", "Self-signup", "Allow new users to register accounts"],
              ["emailVerificationEnabled", "Email verification", "Require email verification before users can sign in"]
            ] as [keyof RuntimeSettings, string, string][]).map(([key, label, desc]) => (
              <div key={key} className="flex items-center justify-between px-5 py-4">
                <div>
                  <div className="text-sm font-medium">{label}</div>
                  <div className="text-xs text-ink-400">{desc}</div>
                </div>
                <button
                  disabled={saving}
                  onClick={() => void toggleSetting(key)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${runtime[key] ? "bg-accent-500" : "bg-ink-700"} disabled:opacity-50`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${runtime[key] ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Feature Usage Stats */}
        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-400">Feature usage</h2>
            <span className="text-xs text-ink-500">Last 6 months</span>
          </div>

          {/* Monthly breakdown table */}
          <div className="overflow-x-auto rounded-2xl border border-ink-700 bg-ink-900">
            <table className="w-full text-sm">
              <thead className="border-b border-ink-700 bg-ink-850/60">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-400">Period</th>
                  {features.map((f) => (
                    <th key={f} className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-ink-400">{featureLabel[f]}</th>
                  ))}
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-ink-400">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                {periods.map((period) => {
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
                        return (
                          <td key={f} className={`px-4 py-3 text-right tabular-nums ${count > 0 ? "text-ink-100" : "text-ink-600"}`}>
                            {count > 0 ? count.toLocaleString() : "—"}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-ink-100">
                        {rowTotal > 0 ? rowTotal.toLocaleString() : "—"}
                      </td>
                    </tr>
                  );
                })}
                {/* Grand total row */}
                <tr className="border-t-2 border-ink-600 bg-ink-850/40">
                  <td className="px-4 py-3 text-xs font-semibold text-ink-300">6-month total</td>
                  {features.map((f) => (
                    <td key={f} className="px-4 py-3 text-right font-semibold tabular-nums text-ink-200">
                      {(grandTotals.get(f) ?? 0).toLocaleString() || "—"}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-accent-300">
                    {features.reduce((s, f) => s + (grandTotals.get(f) ?? 0), 0).toLocaleString() || "—"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Per-user breakdown for current month */}
          {perUserMap.size > 0 ? (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-ink-700 bg-ink-900">
              <div className="border-b border-ink-700 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-ink-400">
                Per-user breakdown — {currentPeriod}
              </div>
              <table className="w-full text-sm">
                <thead className="border-b border-ink-700 bg-ink-850/40">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-ink-400">User</th>
                    {features.map((f) => (
                      <th key={f} className="px-4 py-3 text-right text-xs font-semibold text-ink-400">{featureLabel[f]}</th>
                    ))}
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
                          return (
                            <td key={f} className={`px-4 py-3 text-right tabular-nums ${count > 0 ? "text-ink-100" : "text-ink-600"}`}>
                              {count > 0 ? count.toLocaleString() : "—"}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-right font-semibold tabular-nums text-accent-300">
                          {total.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-ink-700/60 bg-ink-900/50 px-4 py-3 text-sm text-ink-500">
              No usage recorded this month.
            </div>
          )}
        </section>

        {/* Users Table */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-ink-400">Users</h2>
          <div className="overflow-hidden rounded-2xl border border-ink-700 bg-ink-900">
            <table className="w-full text-sm">
              <thead className="border-b border-ink-700 bg-ink-850/60">
                <tr>
                  {["Name / Email", "Role", "Notes", "Verified", "Joined", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                {users.map((u) => {
                  const nc = noteCountMap.get(u.id);
                  return (
                    <tr key={u.id} className={u.disabledAt ? "opacity-50" : ""}>
                      <td className="px-4 py-3">
                        <div className="font-medium">{u.name}</div>
                        <div className="text-xs text-ink-400">{u.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={u.role}
                          disabled={!!actionBusy}
                          onChange={(e) => void userAction(u.id, { role: e.target.value })}
                          className="rounded bg-ink-800 px-2 py-1 text-xs"
                        >
                          <option value="user">user</option>
                          <option value="admin">admin</option>
                          <option value="owner">owner</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-xs tabular-nums text-ink-400">
                        {nc ? (
                          <span>{nc.noteCount.toLocaleString()} <span className="text-ink-600">/ {nc.chunkCount.toLocaleString()} chunks</span></span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {u.emailVerifiedAt ? (
                          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-400">Yes</span>
                        ) : (
                          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-400">No</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-400">{u.createdAt.slice(0, 10)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            disabled={!!actionBusy}
                            onClick={() => void userAction(u.id, { disabled: !u.disabledAt })}
                            className="rounded border border-ink-700 px-2 py-1 text-xs hover:border-amber-400/40 hover:text-amber-400"
                          >
                            {u.disabledAt ? "Enable" : "Disable"}
                          </button>
                          <button
                            disabled={!!actionBusy}
                            onClick={() => void deleteUser(u.id, u.name)}
                            className="rounded border border-ink-700 px-2 py-1 text-xs hover:border-danger-400/40 hover:text-danger-400"
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
        </section>

        {/* Audit Log */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-ink-400">Recent audit log</h2>
          <div className="divide-y divide-ink-800 rounded-2xl border border-ink-700 bg-ink-900">
            {logs.length === 0 ? (
              <div className="px-5 py-4 text-sm text-ink-400">No audit events yet.</div>
            ) : logs.map((log) => (
              <div key={log.id} className="flex items-start gap-4 px-5 py-3">
                <span className={`mt-0.5 rounded px-1.5 py-0.5 text-xs font-semibold ${log.level === "error" ? "bg-danger-400/10 text-danger-400" : log.level === "warn" ? "bg-amber-400/10 text-amber-400" : "bg-ink-700 text-ink-300"}`}>
                  {log.level}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm">{log.event}</div>
                  {log.metadataJson ? <div className="mt-0.5 truncate text-xs text-ink-500">{log.metadataJson}</div> : null}
                </div>
                <div className="shrink-0 text-xs text-ink-500">{log.createdAt.slice(0, 16).replace("T", " ")}</div>
              </div>
            ))}
          </div>
        </section>

        {/* User Feedback */}
        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-400">User feedback</h2>
            <span className="text-xs text-ink-500">{feedback.length} submission{feedback.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="divide-y divide-ink-800 rounded-2xl border border-ink-700 bg-ink-900">
            {feedback.length === 0 ? (
              <div className="px-5 py-4 text-sm text-ink-400">No feedback submitted yet.</div>
            ) : feedback.map((item) => (
              <div key={item.id} className="px-5 py-4">
                <div className="mb-1 flex items-center gap-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    item.category === "bug" ? "bg-danger-400/15 text-danger-400" :
                    item.category === "feature" ? "bg-accent-500/15 text-accent-300" :
                    "bg-ink-700 text-ink-300"
                  }`}>
                    {item.category === "bug" ? "Bug report" : item.category === "feature" ? "Feature request" : "General"}
                  </span>
                  <span className="text-xs font-medium text-ink-200">{item.name}</span>
                  <span className="text-xs text-ink-500">{item.email}</span>
                  <span className="ml-auto text-xs text-ink-500">{item.createdAt.slice(0, 16).replace("T", " ")}</span>
                </div>
                <p className="text-sm text-ink-300 whitespace-pre-wrap">{item.message}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
