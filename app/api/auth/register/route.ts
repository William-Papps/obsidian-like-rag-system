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
    .refine((p) => /[0-9]/.test(p), "Password must contain at least one number"),
  turnstileToken: z.string().optional()
});

async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) return true; // Not configured — skip
  if (!token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v1/siteverify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ secret, response: token, remoteip: ip === "local" ? undefined : ip })
    });
    const data = await res.json() as { success: boolean };
    return data.success;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const ip = clientIp(request);
    await enforceRateLimit(`auth:register:${ip}`, 6, 1000 * 60 * 30);
    const body = schema.parse(await request.json());
    await enforceRateLimit(`auth:register_email:${body.email.trim().toLowerCase()}`, 6, 1000 * 60 * 30);
    // Only verify the token if the client actually sent one — widget may fail
    // to load in some browsers (Opera GX, strict privacy modes, ad blockers).
    // Rate limiting above is the primary bot defence when Turnstile degrades.
    if (body.turnstileToken && !await verifyTurnstile(body.turnstileToken, ip)) {
      return NextResponse.json({ error: "Bot verification failed. Please try again." }, { status: 400 });
    }
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
      return NextResponse.json({ error: error.message, retryAfterSeconds: Math.ceil(error.retryAfterMs / 1000) }, { status: 429 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Registration failed" }, { status: 400 });
  }
}
