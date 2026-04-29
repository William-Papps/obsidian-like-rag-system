import { NextResponse } from "next/server";
import { z } from "zod";
import { applySessionCookie, verifyEmailCode } from "@/lib/auth";
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
    const { session, ...result } = await verifyEmailCode(body);
    const response = NextResponse.json(result);
    response.headers.set("cache-control", "no-store");
    response.headers.set("x-eternalnotes-set-cookie", "1");
    // Debug headers to help diagnose cookie issues
    const forwardedProto = request.headers.get("x-forwarded-proto") || "";
    const cfVisitor = request.headers.get("cf-visitor") || "";
    const isHttps = forwardedProto.toLowerCase().includes("https") || cfVisitor.toLowerCase().includes("\"scheme\":\"https\"");
    response.headers.set("x-eternalnotes-https-detected", isHttps ? "true" : "false");
    applySessionCookie(response, session, request);
    return response;
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Verification failed" }, { status: 400 });
  }
}
