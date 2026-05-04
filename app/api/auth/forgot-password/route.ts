import { NextResponse } from "next/server";
import { z } from "zod";
import { forgotPassword } from "@/lib/auth";
import { RateLimitError, clientIp, enforceRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({ email: z.string().email() });

export async function POST(request: Request) {
  try {
    await enforceRateLimit(`auth:forgot-password:${clientIp(request)}`, 5, 1000 * 60 * 30);
    const body = schema.parse(await request.json());
    const origin = request.headers.get("origin") || request.headers.get("x-forwarded-proto")
      ? `${request.headers.get("x-forwarded-proto") || "https"}://${request.headers.get("host")}`
      : "http://localhost:3000";
    const result = await forgotPassword(body.email, origin);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message, retryAfterSeconds: Math.ceil(error.retryAfterMs / 1000) }, { status: 429 });
    }
    return NextResponse.json({ ok: true }); // always return ok — don't leak account existence
  }
}
