import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthenticatedUser } from "@/lib/auth";
import { createInvite, isWorkspaceMember, listWorkspaceMembers } from "@/lib/services/workspaces";
import { dbGet } from "@/lib/db";

const inviteSchema = z.object({
  email: z.string().email()
});

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuthenticatedUser(async (user) => {
    const { id } = await params;
    const member = await isWorkspaceMember(id, user.id);
    if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const members = await listWorkspaceMembers(id);
    return NextResponse.json(members);
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuthenticatedUser(async (user) => {
    const { id } = await params;
    const member = await isWorkspaceMember(id, user.id);
    if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const roleRow = await dbGet<{ role: string }>(
      "select role from workspace_members where workspace_id = ? and user_id = ?",
      [id, user.id]
    );
    if (roleRow?.role !== "owner") {
      return NextResponse.json({ error: "Only the workspace owner can invite members." }, { status: 403 });
    }

    const body = inviteSchema.parse(await request.json());
    const { token, inviteId } = await createInvite(id, user.id, body.email);
    return NextResponse.json({ token, inviteId }, { status: 201 });
  });
}
