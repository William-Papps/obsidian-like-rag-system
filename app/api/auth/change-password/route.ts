import { NextResponse } from "next/server";
import { z } from "zod";
import { changePassword, withAuthenticatedUser } from "@/lib/auth";
import { RateLimitError, clientIp, enforceRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const passwordPolicy = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .max(200)
  .refine((p) => /[A-Z]/.test(p), "Password must contain at least one uppercase letter")
  .refine((p) => /[0-9]/.test(p), "Password must contain at least one number");

const schema = z
  .object({
    currentPassword: z.string().min(1).max(200),
    newPassword: passwordPolicy,
    confirmPassword: z.string().min(1).max(200)
  })
  .refine((input) => input.newPassword === input.confirmPassword, {
    message: "New passwords do not match.",
    path: ["confirmPassword"]
  });

export async function POST(request: Request) {
  try {
    await enforceRateLimit(`auth:change-password:${clientIp(request)}`, 8, 1000 * 60 * 10);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message, retryAfterSeconds: Math.ceil(error.retryAfterMs / 1000) }, { status: 429 });
    }
    throw error;
  }

  return withAuthenticatedUser(async (user) => {
    try {
      const body = schema.parse(await request.json());
      await changePassword(user.id, body);
      return NextResponse.json({ ok: true });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to change password" }, { status: 400 });
    }
  });
}
