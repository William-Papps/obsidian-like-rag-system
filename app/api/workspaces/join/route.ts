import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthenticatedUser } from "@/lib/auth";
import { consumeInvite } from "@/lib/services/workspaces";

const joinSchema = z.object({
  token: z.string().min(1)
});

export async function POST(request: Request) {
  return withAuthenticatedUser(async (user) => {
    const body = joinSchema.parse(await request.json());
    const result = await consumeInvite(body.token, user.id);
    if (!result) return NextResponse.json({ error: "Invalid or expired invite" }, { status: 400 });
    return NextResponse.json(result);
  });
}
