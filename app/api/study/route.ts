import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { extractiveSummary, generateFlashcards, generateQuiz } from "@/lib/rag/study";

export const dynamic = "force-dynamic";

const schema = z.object({
  mode: z.enum(["quiz", "flashcards", "summary"]),
  scope: z.object({ noteId: z.string().optional(), folderId: z.string().nullable().optional() }).optional()
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const body = schema.parse(await request.json());
  const scope = body.scope ?? {};
  if (body.mode === "quiz") return NextResponse.json(await generateQuiz(user.id, scope));
  if (body.mode === "flashcards") return NextResponse.json(await generateFlashcards(user.id, scope));
  return NextResponse.json(await extractiveSummary(user.id, scope));
}
