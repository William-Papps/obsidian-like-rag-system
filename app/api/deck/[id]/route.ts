import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthenticatedUser } from "@/lib/auth";
import { deleteFlashcard, recordCardReview } from "@/lib/services/flashcards";
import { dbGet } from "@/lib/db";
import { recordStudyAttempt } from "@/lib/services/learning-analytics";
import type { AttemptResult } from "@/lib/services/learning-analytics";

export const dynamic = "force-dynamic";

const reviewSchema = z.object({ quality: z.number().int().min(0).max(5) });

function qualityToResult(quality: number): AttemptResult {
  if (quality >= 4) return "correct";
  if (quality >= 2) return "partial";
  return "incorrect";
}

function qualityToScore(quality: number): number {
  return quality / 5;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuthenticatedUser(async (user) => {
    const { id } = await params;
    const { quality } = reviewSchema.parse(await request.json());

    // Fetch card before updating so we can record the attempt with note context.
    const cardRow = await dbGet<{ note_id: string | null; prompt: string; answer: string }>(
      "select note_id, prompt, answer from flashcards where id = ? and user_id = ?",
      [id, user.id]
    );

    const card = await recordCardReview(user.id, id, quality as 0 | 1 | 2 | 3 | 4 | 5);
    if (!card) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await recordStudyAttempt(user.id, {
      mode: "flashcard",
      noteId: cardRow?.note_id ?? null,
      chunkId: null,
      prompt: cardRow?.prompt ?? null,
      expectedAnswer: cardRow?.answer ?? null,
      userAnswer: null,
      score: qualityToScore(quality),
      result: qualityToResult(quality),
      confidence: null
    });

    return NextResponse.json(card);
  });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuthenticatedUser(async (user) => {
    const { id } = await params;
    await deleteFlashcard(user.id, id);
    return NextResponse.json({ ok: true });
  });
}
