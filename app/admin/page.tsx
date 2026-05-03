"use client";

import { useEffect, useState, useCallback } from "react";
import type { AdminUserSummary, AuditLog, RuntimeSettings } from "@/lib/types";

type AdminPayload = {
  runtime: RuntimeSettings;
  users: AdminUserSummary[];
  logs: AuditLog[];
};

export default function AdminPage() {
  const [data, setData] = useState<AdminPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin");
    if (res.status === 401) { window.location.href = "/auth"; return; }
    if (res.status === 403) { setError("Admin access required."); return; }
    if (!res.ok) { setError("Failed to load admin data."); return; }
    setData(await res.json() as AdminPayload);
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

  const { runtime, users, logs } = data;

  return (
    <div className="min-h-screen bg-ink-950 text-ink-100">
      <div className="mx-auto max-w-5xl px-6 py-10 space-y-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Admin dashboard</h1>
            <p className="mt-1 text-sm text-ink-400">{users.length} user{users.length !== 1 ? "s" : ""} registered</p>
          </div>
          <div className="flex gap-3">
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
              ["hostedAiEnabled", "Hosted AI", "Enable the server-side OpenAI key for non-API-key users"],
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

        {/* Users Table */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-ink-400">Users</h2>
          <div className="overflow-hidden rounded-2xl border border-ink-700 bg-ink-900">
            <table className="w-full text-sm">
              <thead className="border-b border-ink-700 bg-ink-850/60">
                <tr>
                  {["Name / Email", "Role", "Plan", "Status", "Joined", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                {users.map((u) => (
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
                    <td className="px-4 py-3">
                      <select
                        value={u.hostedPlan}
                        disabled={!!actionBusy}
                        onChange={(e) => void userAction(u.id, { hostedPlan: e.target.value })}
                        className="rounded bg-ink-800 px-2 py-1 text-xs"
                      >
                        <option value="free">free</option>
                        <option value="starter">starter</option>
                        <option value="pro">pro</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-400">{u.subscriptionStatus}</td>
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
                ))}
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
      </div>
    </div>
  );
}
