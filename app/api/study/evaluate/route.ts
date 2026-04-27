import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthenticatedUser } from "@/lib/auth";
import { evaluateQuizAnswer } from "@/lib/rag/evaluate";
import { recordStudyActivity } from "@/lib/services/study-history";

export const dynamic = "force-dynamic";

const schema = z.object({
  question: z.string(),
  userAnswer: z.string(),
  expectedAnswer: z.string(),
  sourceExcerpt: z.string()
});

export async function POST(request: Request) {
  return withAuthenticatedUser(async (user) => {
    const body = schema.parse(await request.json());
    const result = await evaluateQuizAnswer(user.id, body);
    await recordStudyActivity(user.id, "quiz_checked");
    return NextResponse.json(result);
  });
}
