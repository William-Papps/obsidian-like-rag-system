import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthenticatedUser } from "@/lib/auth";
import { extractiveSummary, generateFlashcards, generateQuiz } from "@/lib/rag/study";
import { resolveScopeTitle } from "@/lib/rag/retrieval";
import { recordStudyActivity } from "@/lib/services/study-history";
import { enforceRateLimit, RateLimitError } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  mode: z.enum(["quiz", "flashcards", "summary"]),
  scope: z.object({ noteId: z.string().optional(), folderId: z.string().nullable().optional() }).optional()
});

export async function POST(request: Request) {
  return withAuthenticatedUser(async (user) => {
    try {
      await enforceRateLimit(`study:${user.id}`, 30, 60_000);
    } catch (err) {
      if (err instanceof RateLimitError) {
        return NextResponse.json({ error: err.message }, { status: 429, headers: { "retry-after": String(Math.ceil(err.retryAfterMs / 1000)) } });
      }
      throw err;
    }
    try {
      const body = schema.parse(await request.json());
      const scope = body.scope ?? {};
      const scopeLabel = await resolveScopeTitle(user.id, scope);
      if (body.mode === "quiz") {
        const result = await generateQuiz(user.id, scope);
        if (result[0]) await recordStudyActivity(user.id, "quiz_generated", { scopeLabel, noteTitle: result[0].source.noteTitle });
        return NextResponse.json(result);
      }
      if (body.mode === "flashcards") {
        const result = await generateFlashcards(user.id, scope);
        if (result[0]) await recordStudyActivity(user.id, "flashcard_generated", { scopeLabel, noteTitle: result[0].source.noteTitle });
        return NextResponse.json(result);
      }
      const result = await extractiveSummary(user.id, scope);
      if (result[0]) await recordStudyActivity(user.id, "summary_generated", { scopeLabel, noteTitle: result[0].source.noteTitle });
      return NextResponse.json(result);
    } catch (error) {
      throw error;
    }
  });
}
