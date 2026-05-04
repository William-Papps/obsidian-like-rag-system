import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, resetPassword } from "@/lib/auth";
import { RateLimitError, clientIp, enforceRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email(),
  token: z.string().min(1),
  newPassword: z.string().min(8).max(200)
});

export async function POST(request: Request) {
  try {
    await enforceRateLimit(`auth:reset-password:${clientIp(request)}`, 8, 1000 * 60 * 15);
    const body = schema.parse(await request.json());
    await resetPassword(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message, retryAfterSeconds: Math.ceil(error.retryAfterMs / 1000) }, { status: 429 });
    }
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Password reset failed" }, { status: 400 });
  }
}
