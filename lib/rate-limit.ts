import { dbGet, dbRun } from "@/lib/db";
import { now } from "@/lib/utils";

export class RateLimitError extends Error {
  retryAfterMs: number;

  constructor(message: string, retryAfterMs: number) {
    super(message);
    this.name = "RateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

export async function enforceRateLimit(key: string, maxAttempts: number, windowMs: number) {
  const currentTime = Date.now();
  const resetAt = new Date(currentTime + windowMs).toISOString();

  await dbRun("delete from rate_limits where reset_at <= ?", [now()]);
  const existing = await dbGet<{ count: number; reset_at: string }>("select count, reset_at from rate_limits where key = ?", [key]);

  if (!existing) {
    await dbRun("insert into rate_limits (key, count, reset_at, created_at, updated_at) values (?, 1, ?, ?, ?)", [key, resetAt, now(), now()]);
    return;
  }

  const retryAfterMs = Math.max(0, new Date(existing.reset_at).getTime() - currentTime);
  if (existing.count >= maxAttempts) {
    throw new RateLimitError("Too many attempts. Try again shortly.", retryAfterMs);
  }

  await dbRun("update rate_limits set count = count + 1, updated_at = ? where key = ?", [now(), key]);
}

export function clientIp(request: Request) {
  const trustProxy = (process.env.TRUST_PROXY ?? "false").toLowerCase() === "true";
  if (!trustProxy) return "local";

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first && /^[0-9a-fA-F:.]+$/.test(first)) return first;
  }
  const real = request.headers.get("x-real-ip")?.trim();
  if (real && /^[0-9a-fA-F:.]+$/.test(real)) return real;
  return "local";
}
