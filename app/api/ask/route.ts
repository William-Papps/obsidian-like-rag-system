import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { answerFromNotes } from "@/lib/rag/answer";

export const dynamic = "force-dynamic";

const schema = z.object({
  question: z.string().min(1),
  scope: z.object({ noteId: z.string().optional(), folderId: z.string().nullable().optional() }).optional()
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const body = schema.parse(await request.json());
  return NextResponse.json(await answerFromNotes(user.id, body.question, body.scope ?? {}));
}
