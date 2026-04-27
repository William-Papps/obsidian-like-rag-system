import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin, withAuthenticatedUser } from "@/lib/auth";
import { logAudit } from "@/lib/services/audit";
import { adminSetHostedAccess, adminSetUserPlan, deleteUserAccount, getManagedUser, setUserDisabled, updateUserRole } from "@/lib/services/users";

const patchSchema = z.object({
  role: z.enum(["user", "admin", "owner"]).optional(),
  disabled: z.boolean().optional(),
  hostedPlan: z.enum(["free", "starter", "pro"]).optional(),
  hostedAccessGranted: z.boolean().optional()
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuthenticatedUser(async (user) => {
    if (!isAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id } = await params;
    const target = await getManagedUser(id);
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = patchSchema.parse(await request.json());
    if (body.role) await updateUserRole(id, body.role);
    if (body.disabled !== undefined) await setUserDisabled(id, body.disabled);
    if (body.hostedPlan) await adminSetUserPlan(id, body.hostedPlan);
    if (body.hostedAccessGranted !== undefined) await adminSetHostedAccess(id, body.hostedAccessGranted);
    await logAudit({ actorUserId: user.id, event: "admin.user.updated", metadata: { targetUserId: id, ...body } });
    return NextResponse.json({ ok: true });
  });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuthenticatedUser(async (user) => {
    if (!isAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id } = await params;
    if (id === user.id) return NextResponse.json({ error: "You cannot delete your own account from this route." }, { status: 400 });
    await deleteUserAccount(id);
    await logAudit({ actorUserId: user.id, event: "admin.user.deleted", level: "warn", metadata: { targetUserId: id } });
    return NextResponse.json({ ok: true });
  });
}
