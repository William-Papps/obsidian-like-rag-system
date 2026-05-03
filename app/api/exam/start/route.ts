import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthenticatedUser } from "@/lib/auth";
import { startExam } from "@/lib/services/exam";

export const dynamic = "force-dynamic";

const schema = z.object({
  noteId: z.string().optional(),
  folderId: z.string().nullable().optional(),
  scopeLabel: z.string().min(1).max(120),
  questionCount: z.number().int().min(1).max(20).optional()
});

export async function POST(request: Request) {
  return withAuthenticatedUser(async (user) => {
    const body = schema.parse(await request.json());
    const scope = { noteId: body.noteId, folderId: body.folderId };
    const result = await startExam(user.id, scope, body.scopeLabel, body.questionCount);
    return NextResponse.json(result);
  });
}
