import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthenticatedUser } from "@/lib/auth";
import { deleteWorkspace, getWorkspaceForUser, updateWorkspace } from "@/lib/services/workspaces";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional()
});

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuthenticatedUser(async (user) => {
    const { id } = await params;
    const workspace = await getWorkspaceForUser(id, user.id);
    return workspace ? NextResponse.json(workspace) : NextResponse.json({ error: "Not found" }, { status: 404 });
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuthenticatedUser(async (user) => {
    const { id } = await params;
    const body = updateSchema.parse(await request.json());
    const workspace = await updateWorkspace(id, user.id, body);
    return workspace ? NextResponse.json(workspace) : NextResponse.json({ error: "Not found" }, { status: 404 });
  });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuthenticatedUser(async (user) => {
    const { id } = await params;
    const ok = await deleteWorkspace(id, user.id);
    return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Not found" }, { status: 404 });
  });
}
