import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin, withAuthenticatedUser } from "@/lib/auth";
import { listAuditLogs, logAudit } from "@/lib/services/audit";
import { getRuntimeSettings, saveRuntimeSettings } from "@/lib/services/runtime-settings";
import { listManagedUsers } from "@/lib/services/users";
import { dbAll } from "@/lib/db";

export const dynamic = "force-dynamic";

const schema = z.object({
  selfSignupEnabled: z.boolean().optional(),
  emailVerificationEnabled: z.boolean().optional()
});

export async function GET() {
  return withAuthenticatedUser(async (user) => {
    if (!isAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Last 6 month periods in YYYY-MM format. Use Date.UTC to avoid local-
    // timezone offsets shifting the month when reading back via getUTC* methods.
    const periods: string[] = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      periods.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
    }

    // Aggregate usage across all users grouped by period + feature.
    const usageRows = await dbAll<{ period: string; feature: string; total: number }>(
      `select period, feature, sum(count) as total
       from ai_usage
       where period in (${periods.map(() => "?").join(",")})
       group by period, feature
       order by period desc, feature asc`,
      periods
    );

    // Per-user totals for the current period, joined with user name/email.
    const perUserRows = await dbAll<{ user_id: string; name: string; email: string; feature: string; count: number }>(
      `select a.user_id, coalesce(u.name, 'Deleted user') as name, coalesce(u.email, a.user_id) as email, a.feature, a.count
       from ai_usage a
       left join users u on u.id = a.user_id
       where a.period = ?
       order by a.user_id, a.feature`,
      [periods[0]]
    );

    // Note and chunk counts per user (capped to avoid timeout on large datasets).
    const noteCountRows = await dbAll<{ user_id: string; note_count: number; chunk_count: number }>(
      `select n.user_id, count(distinct n.id) as note_count, count(c.id) as chunk_count
       from notes n
       left join chunks c on c.note_id = n.id
       group by n.user_id
       limit 200`
    );

    return NextResponse.json({
      runtime: await getRuntimeSettings(),
      users: await listManagedUsers(),
      logs: await listAuditLogs(40),
      usageByPeriod: usageRows,
      currentPeriodPerUser: perUserRows,
      noteCounts: noteCountRows,
      periods
    });
  });
}

export async function PATCH(request: Request) {
  return withAuthenticatedUser(async (user) => {
    if (!isAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const body = schema.parse(await request.json());
    const runtime = await saveRuntimeSettings(body);
    await logAudit({ actorUserId: user.id, event: "admin.runtime_settings.updated", metadata: body });
    return NextResponse.json({ runtime });
  });
}

export async function DELETE() {
  return withAuthenticatedUser(async (user) => {
    if (!isAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const { dbRun } = await import("@/lib/db");
    await dbRun("delete from audit_logs where created_at < ?", [cutoff.toISOString()]);
    await logAudit({ actorUserId: user.id, event: "admin.audit_log.purged", metadata: { olderThanDays: 90 } });
    return NextResponse.json({ ok: true });
  });
}
