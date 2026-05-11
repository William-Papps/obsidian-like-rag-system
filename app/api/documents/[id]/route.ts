import { NextResponse } from "next/server";
import { withAuthenticatedUser } from "@/lib/auth";
import { deleteDocument } from "@/lib/services/documents";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuthenticatedUser(async (user) => {
    const { id } = await params;
    await deleteDocument(user.id, id);
    return NextResponse.json({ ok: true });
  });
}
