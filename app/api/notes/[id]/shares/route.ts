import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthenticatedUser } from "@/lib/auth";
import { listNoteShares, shareNote } from "@/lib/services/note-shares";

export const dynamic = "force-dynamic";

const shareSchema = z.object({
  email: z.string().email(),
  permission: z.enum(["view", "edit"])
});

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuthenticatedUser(async (user) => {
    const { id } = await params;
    try {
      const shares = await listNoteShares(user.id, id);
      return NextResponse.json(shares);
    } catch (error) {
      console.error("[shares] listNoteShares failed:", error);
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuthenticatedUser(async (user) => {
    const { id } = await params;
    try {
      const body = shareSchema.parse(await request.json());
      const share = await shareNote(user.id, id, body.email, body.permission);
      return NextResponse.json(share, { status: 201 });
    } catch (error) {
      console.error("[shares] shareNote failed:", error);
      return NextResponse.json({ error: "Failed to share note" }, { status: 400 });
    }
  });
}
