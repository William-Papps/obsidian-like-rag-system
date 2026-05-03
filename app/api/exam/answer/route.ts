import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthenticatedUser } from "@/lib/auth";
import { answerQuestion } from "@/lib/services/exam";

export const dynamic = "force-dynamic";

const schema = z.object({
  sessionId: z.string(),
  questionId: z.string(),
  userAnswer: z.string().min(1).max(4000),
  confidence: z.number().int().min(1).max(5)
});

export async function POST(request: Request) {
  return withAuthenticatedUser(async (user) => {
    const body = schema.parse(await request.json());
    const result = await answerQuestion(user.id, body.sessionId, body.questionId, body.userAnswer, body.confidence);
    return NextResponse.json(result);
  });
}
