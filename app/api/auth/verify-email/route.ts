import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyEmailCode } from "@/lib/auth";
import { RateLimitError, clientIp, enforceRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email(),
  code: z.string().trim().min(4).max(12)
});

export async function POST(request: Request) {
  try {
    await enforceRateLimit(`auth:verify-email:${clientIp(request)}`, 12, 1000 * 60 * 15);
    const body = schema.parse(await request.json());
    const result = await verifyEmailCode(body);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Verification failed" }, { status: 400 });
  }
}
