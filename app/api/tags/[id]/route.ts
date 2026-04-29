import { NextResponse } from "next/server";
import { withAuthenticatedUser } from "@/lib/auth";
import { deleteTag } from "@/lib/services/tags";

export const dynamic = "force-dynamic";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuthenticatedUser(async (user) => {
    const { id } = await params;
    await deleteTag(user.id, id);
    return NextResponse.json({ ok: true });
  });
}
