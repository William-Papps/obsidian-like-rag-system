import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin, withAuthenticatedUser } from "@/lib/auth";
import { listAuditLogs, logAudit } from "@/lib/services/audit";
import { getRuntimeSettings, saveRuntimeSettings } from "@/lib/services/runtime-settings";
import { listManagedUsers } from "@/lib/services/users";

export const dynamic = "force-dynamic";

const schema = z.object({
  selfSignupEnabled: z.boolean().optional(),
  hostedAiEnabled: z.boolean().optional(),
  emailVerificationEnabled: z.boolean().optional()
});

export async function GET() {
  return withAuthenticatedUser(async (user) => {
    if (!isAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({
      runtime: await getRuntimeSettings(),
      users: await listManagedUsers(),
      logs: await listAuditLogs(40)
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
