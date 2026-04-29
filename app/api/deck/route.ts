import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthenticatedUser } from "@/lib/auth";
import { getDeckStats, listAllCards, listDueCards, saveFlashcard } from "@/lib/services/flashcards";

export const dynamic = "force-dynamic";

const saveSchema = z.object({
  noteId: z.string().nullable().optional(),
  prompt: z.string().min(1),
  answer: z.string().min(1),
  sourceExcerpt: z.string()
});

export async function GET(request: Request) {
  return withAuthenticatedUser(async (user) => {
    const url = new URL(request.url);
    const mode = url.searchParams.get("mode");
    if (mode === "due") return NextResponse.json(await listDueCards(user.id));
    if (mode === "stats") return NextResponse.json(await getDeckStats(user.id));
    return NextResponse.json(await listAllCards(user.id));
  });
}

export async function POST(request: Request) {
  return withAuthenticatedUser(async (user) => {
    const body = saveSchema.parse(await request.json());
    const card = await saveFlashcard(user.id, { noteId: body.noteId ?? null, prompt: body.prompt, answer: body.answer, sourceExcerpt: body.sourceExcerpt });
    return NextResponse.json(card, { status: 201 });
  });
}
