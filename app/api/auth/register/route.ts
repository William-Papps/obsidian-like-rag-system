import { NextResponse } from "next/server";
import { z } from "zod";
import { applySessionCookie, registerUser } from "@/lib/auth";
import { RateLimitError, clientIp, enforceRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().email(),
  password: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .max(200)
    .refine((p) => /[A-Z]/.test(p), "Password must contain at least one uppercase letter")
    .refine((p) => /[0-9]/.test(p), "Password must contain at least one number")
});

export async function POST(request: Request) {
  try {
    await enforceRateLimit(`auth:register:${clientIp(request)}`, 6, 1000 * 60 * 30);
    const body = schema.parse(await request.json());
    const { session, ...result } = await registerUser(body);
    const response = NextResponse.json(result, { status: 201 });
    response.headers.set("cache-control", "no-store");
    response.headers.set("x-eternalnotes-set-cookie", session ? "1" : "0");
    // Debug headers to help diagnose cookie issues
    const forwardedProto = request.headers.get("x-forwarded-proto") || "";
    const cfVisitor = request.headers.get("cf-visitor") || "";
    const isHttps = forwardedProto.toLowerCase().includes("https") || cfVisitor.toLowerCase().includes("\"scheme\":\"https\"");
    response.headers.set("x-eternalnotes-https-detected", isHttps ? "true" : "false");
    if (session) applySessionCookie(response, session, request);
    return response;
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Registration failed" }, { status: 400 });
  }
}
