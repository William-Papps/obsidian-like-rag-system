import { NextResponse } from "next/server";
import { z } from "zod";
import { applySessionCookie, registerUser } from "@/lib/auth";
import { RateLimitError, clientIp, enforceRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(200)
});

export async function POST(request: Request) {
  try {
    await enforceRateLimit(`auth:register:${clientIp(request)}`, 6, 1000 * 60 * 30);
    const body = schema.parse(await request.json());
    const { session, ...result } = await registerUser(body);
    const response = NextResponse.json(result, { status: 201 });
    response.headers.set("cache-control", "no-store");
    response.headers.set("x-eternalnotes-set-cookie", session ? "1" : "0");
    if (session) applySessionCookie(response, session, request);
    return response;
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Registration failed" }, { status: 400 });
  }
}
