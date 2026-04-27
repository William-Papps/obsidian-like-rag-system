import { NextResponse } from "next/server";
import { z } from "zod";
import { loginUser, VerificationRequiredError } from "@/lib/auth";
import { RateLimitError, clientIp, enforceRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200)
});

export async function POST(request: Request) {
  try {
    await enforceRateLimit(`auth:login:${clientIp(request)}`, 10, 1000 * 60 * 10);
    const body = schema.parse(await request.json());
    const user = await loginUser(body);
    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    if (error instanceof VerificationRequiredError) {
      return NextResponse.json({ error: error.message, verificationRequired: true, email: error.email, debugCode: error.debugCode ?? null }, { status: 403 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Login failed" }, { status: 401 });
  }
}
