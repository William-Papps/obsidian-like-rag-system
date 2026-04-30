import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthenticatedUser } from "@/lib/auth";
import { explainFromNotes } from "@/lib/rag/answer";
import { QuotaExceededError } from "@/lib/services/ai-access";
import { resolveScopeTitle } from "@/lib/rag/retrieval";
import { recordStudyActivity } from "@/lib/services/study-history";

export const dynamic = "force-dynamic";

const schema = z.object({
  question: z.string().min(1),
  scope: z.object({ noteId: z.string().optional(), folderId: z.string().nullable().optional() }).optional()
});

export async function POST(request: Request) {
  return withAuthenticatedUser(async (user) => {
    try {
      const body = schema.parse(await request.json());
      const scope = body.scope ?? {};
      const answer = await explainFromNotes(user.id, body.question, scope);
      await recordStudyActivity(user.id, "ask", { scopeLabel: await resolveScopeTitle(user.id, scope), noteTitle: answer.citations[0]?.noteTitle ?? null });
      return NextResponse.json(answer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
      }
      if (error instanceof QuotaExceededError) {
        return NextResponse.json({ error: error.message }, { status: 402 });
      }
      const message = error instanceof Error ? error.message : "Ask request failed";
      console.error("[ask] explain failed", error);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}

