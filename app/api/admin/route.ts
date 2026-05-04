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
  hostedAiEnabled: z.boolean().optional(),
  emailVerificationEnabled: z.boolean().optional()
});

export async function GET() {
  return withAuthenticatedUser(async (user) => {
    if (!isAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Last 6 month periods in YYYY-MM format.
    const periods: string[] = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getUTCFullYear(), now.getUTCMonth() - i, 1);
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

    // Per-user totals for the current period.
    const perUserRows = await dbAll<{ user_id: string; feature: string; count: number }>(
      "select user_id, feature, count from ai_usage where period = ?",
      [periods[0]]
    );

    return NextResponse.json({
      runtime: await getRuntimeSettings(),
      users: await listManagedUsers(),
      logs: await listAuditLogs(40),
      usageByPeriod: usageRows,
      currentPeriodPerUser: perUserRows,
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
