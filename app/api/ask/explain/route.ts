import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthenticatedUser } from "@/lib/auth";
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
      const body = schema.parse(await request.json());
      const result = await explainFromNotes(user.id, body.question, body.answer);
      await recordStudyActivity(user.id, "ask", { scopeLabel: "paraphrase", noteTitle: null });
      return NextResponse.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
      }
      const message = error instanceof Error ? error.message : "Paraphrase request failed";
      console.error("[ask] explain failed", error);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}
