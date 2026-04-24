import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { evaluateQuizAnswer } from "@/lib/rag/evaluate";

export const dynamic = "force-dynamic";

const schema = z.object({
  question: z.string(),
  userAnswer: z.string(),
  expectedAnswer: z.string(),
  sourceExcerpt: z.string()
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const body = schema.parse(await request.json());
  return NextResponse.json(await evaluateQuizAnswer(user.id, body));
}
