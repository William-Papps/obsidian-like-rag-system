import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthenticatedUser } from "@/lib/auth";
import { evaluateQuizAnswer } from "@/lib/rag/evaluate";
import { recordStudyActivity } from "@/lib/services/study-history";
import { recordStudyAttempt } from "@/lib/services/learning-analytics";
import { ProPlanRequiredError, requireProAccess } from "@/lib/services/ai-access";

export const dynamic = "force-dynamic";

const schema = z.object({
  question: z.string(),
  userAnswer: z.string(),
  expectedAnswer: z.string(),
  sourceExcerpt: z.string(),
  noteId: z.string().optional(),
  chunkId: z.string().optional()
});

export async function POST(request: Request) {
  return withAuthenticatedUser(async (user) => {
    try {
      await requireProAccess(user.id);
    } catch (error) {
      if (error instanceof ProPlanRequiredError) {
        return NextResponse.json({ error: error.message }, { status: 402 });
      }
      throw error;
    }
    const body = schema.parse(await request.json());
    const result = await evaluateQuizAnswer(user.id, body);

    const scoreMap = { correct: 1.0, partial: 0.5, incorrect: 0.0 } as const;
    await recordStudyAttempt(user.id, {
      mode: "quiz",
      noteId: body.noteId ?? null,
      chunkId: body.chunkId ?? null,
      prompt: body.question,
      expectedAnswer: body.expectedAnswer,
      userAnswer: body.userAnswer,
      score: scoreMap[result.verdict],
      result: result.verdict,
      confidence: null
    });

    await recordStudyActivity(user.id, "quiz_checked");
    return NextResponse.json(result);
  });
}
