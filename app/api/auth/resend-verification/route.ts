import { NextResponse } from "next/server";
import { z } from "zod";
import { resendVerificationCode } from "@/lib/auth";
import { RateLimitError, clientIp, enforceRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email()
});

export async function POST(request: Request) {
  try {
    await enforceRateLimit(`auth:resend-verification:${clientIp(request)}`, 5, 1000 * 60 * 15);
    const body = schema.parse(await request.json());
    const result = await resendVerificationCode(body.email);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to resend code" }, { status: 400 });
  }
}
