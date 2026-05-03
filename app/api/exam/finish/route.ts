import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthenticatedUser } from "@/lib/auth";
import { finishExam } from "@/lib/services/exam";

export const dynamic = "force-dynamic";

const schema = z.object({ sessionId: z.string() });

export async function POST(request: Request) {
  return withAuthenticatedUser(async (user) => {
    const { sessionId } = schema.parse(await request.json());
    const result = await finishExam(user.id, sessionId);
    return NextResponse.json(result);
  });
}
