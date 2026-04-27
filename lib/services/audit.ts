import { dbAll, dbRun } from "@/lib/db";
import type { AuditLog } from "@/lib/types";
import { id, now, toCamelRecord } from "@/lib/utils";

export async function logAudit(input: {
  actorUserId?: string | null;
  level?: "info" | "warn" | "error";
  event: string;
  metadata?: Record<string, unknown> | null;
}) {
  await dbRun("insert into audit_logs (id, actor_user_id, level, event, metadata_json, created_at) values (?, ?, ?, ?, ?, ?)", [
    id(),
    input.actorUserId ?? null,
    input.level ?? "info",
    input.event,
    input.metadata ? JSON.stringify(input.metadata) : null,
    now()
  ]);
}

export async function listAuditLogs(limit = 50) {
  const rows = await dbAll("select * from audit_logs order by created_at desc limit ?", [limit]);
  return rows.map((row) => toCamelRecord(row) as AuditLog);
}
