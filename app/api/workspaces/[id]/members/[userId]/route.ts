import { NextResponse } from "next/server";
import { withAuthenticatedUser } from "@/lib/auth";
import { removeMember } from "@/lib/services/workspaces";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; userId: string }> }) {
  return withAuthenticatedUser(async (user) => {
    const { id, userId } = await params;
    const ok = await removeMember(id, userId, user.id);
    return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Forbidden" }, { status: 403 });
  });
}
