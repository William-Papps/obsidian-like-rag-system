import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { deleteFolder, renameFolder } from "@/lib/services/folders";

const schema = z.object({ name: z.string().min(1) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const { id } = await params;
  const body = schema.parse(await request.json());
  await renameFolder(user.id, id, body.name);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const { id } = await params;
  await deleteFolder(user.id, id);
  return NextResponse.json({ ok: true });
}
