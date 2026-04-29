import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthenticatedUser } from "@/lib/auth";
import { deleteFlashcard, recordCardReview } from "@/lib/services/flashcards";

export const dynamic = "force-dynamic";

const reviewSchema = z.object({ quality: z.number().int().min(0).max(5) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuthenticatedUser(async (user) => {
    const { id } = await params;
    const { quality } = reviewSchema.parse(await request.json());
    const card = await recordCardReview(user.id, id, quality as 0 | 1 | 2 | 3 | 4 | 5);
    return card ? NextResponse.json(card) : NextResponse.json({ error: "Not found" }, { status: 404 });
  });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuthenticatedUser(async (user) => {
    const { id } = await params;
    await deleteFlashcard(user.id, id);
    return NextResponse.json({ ok: true });
  });
}
