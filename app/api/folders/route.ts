import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthenticatedUser } from "@/lib/auth";
import { createFolder, listFolders } from "@/lib/services/folders";
import { isWorkspaceMember } from "@/lib/services/workspaces";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().min(1),
  parentId: z.string().nullable().optional(),
  workspaceId: z.string().nullable().optional()
});

export async function GET(request: Request) {
  return withAuthenticatedUser(async (user) => {
    const url = new URL(request.url);
    const workspaceId = url.searchParams.get("workspaceId");
    if (workspaceId) {
      const member = await isWorkspaceMember(workspaceId, user.id);
      if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(await listFolders(user.id, workspaceId));
  });
}

export async function POST(request: Request) {
  return withAuthenticatedUser(async (user) => {
    const body = schema.parse(await request.json());
    if (body.workspaceId) {
      const member = await isWorkspaceMember(body.workspaceId, user.id);
      if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(await createFolder(user.id, body.name, body.parentId ?? null, body.workspaceId), { status: 201 });
  });
}
