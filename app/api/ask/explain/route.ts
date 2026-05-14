import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthenticatedUser } from "@/lib/auth";
import { enforceRateLimit, RateLimitError } from "@/lib/rate-limit";
import { explainFromNotes } from "@/lib/rag/answer";
import { recordStudyActivity } from "@/lib/services/study-history";

export const dynamic = "force-dynamic";

const schema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1)
});

export async function POST(request: Request) {
  return withAuthenticatedUser(async (user) => {
    try {
      await enforceRateLimit(`explain:${user.id}`, 30, 60_000);
      const body = schema.parse(await request.json());
      const result = await explainFromNotes(user.id, body.question, body.answer);
      await recordStudyActivity(user.id, "ask", { scopeLabel: "paraphrase", noteTitle: null });
      return NextResponse.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
      }
      if (error instanceof RateLimitError) {
        return NextResponse.json({ error: error.message }, { status: 429 });
      }
      const message = error instanceof Error ? error.message : "Paraphrase request failed";
      console.error("[ask] explain failed", error);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}
