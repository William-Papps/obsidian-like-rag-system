import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthenticatedUser } from "@/lib/auth";
import { revokeNoteShare, updateNoteShare } from "@/lib/services/note-shares";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  permission: z.enum(["view", "edit"])
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; userId: string }> }) {
  return withAuthenticatedUser(async (user) => {
    const { id, userId } = await params;
    try {
      const body = patchSchema.parse(await request.json());
      await updateNoteShare(user.id, id, userId, body.permission);
      return NextResponse.json({ ok: true });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update share" }, { status: 400 });
    }
  });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; userId: string }> }) {
  return withAuthenticatedUser(async (user) => {
    const { id, userId } = await params;
    try {
      await revokeNoteShare(user.id, id, userId);
      return NextResponse.json({ ok: true });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to revoke share" }, { status: 400 });
    }
  });
}
