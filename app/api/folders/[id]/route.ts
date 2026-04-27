import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthenticatedUser } from "@/lib/auth";
import { deleteFolder, updateFolder } from "@/lib/services/folders";

const schema = z.object({ name: z.string().min(1).optional(), parentId: z.string().nullable().optional() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuthenticatedUser(async (user) => {
    const { id } = await params;
    const body = schema.parse(await request.json());
    try {
      await updateFolder(user.id, id, body);
      return NextResponse.json({ ok: true });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update folder" }, { status: 400 });
    }
  });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuthenticatedUser(async (user) => {
    const { id } = await params;
    await deleteFolder(user.id, id);
    return NextResponse.json({ ok: true });
  });
}
