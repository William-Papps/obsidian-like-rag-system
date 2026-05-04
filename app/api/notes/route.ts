import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthenticatedUser } from "@/lib/auth";
import { createNote, exactSearch, listNotes } from "@/lib/services/notes";
import { isWorkspaceMember } from "@/lib/services/workspaces";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  title: z.string().optional(),
  folderId: z.string().nullable().optional(),
  markdownContent: z.string().optional(),
  workspaceId: z.string().nullable().optional()
});

export async function GET(request: Request) {
  return withAuthenticatedUser(async (user) => {
    const url = new URL(request.url);
    const query = url.searchParams.get("q");
    const workspaceId = url.searchParams.get("workspaceId");
    if (workspaceId) {
      const member = await isWorkspaceMember(workspaceId, user.id);
      if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (query) return NextResponse.json(await exactSearch(user.id, query));
    return NextResponse.json(await listNotes(user.id, workspaceId));
  });
}

export async function POST(request: Request) {
  return withAuthenticatedUser(async (user) => {
    const body = createSchema.parse(await request.json());
    if (body.workspaceId) {
      const member = await isWorkspaceMember(body.workspaceId, user.id);
      if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(await createNote(user.id, body), { status: 201 });
  });
}
