import { dbGet, dbRun } from "@/lib/db";
import type { AiFeature, AiUsage, HostedPlan } from "@/lib/types";
import { id, now } from "@/lib/utils";

export const PLAN_LIMITS: Record<HostedPlan, Record<AiFeature, number | null>> = {
  free: {
    ask: 100,
    quiz: 50,
    flashcards: 50,
    summary: 50,
    ocr: 20,
    index: 100
  },
  starter: {
    ask: 500,
    quiz: 200,
    flashcards: 200,
    summary: 200,
    ocr: 75,
    index: 300
  },
  pro: {
    ask: 1500,
    quiz: 600,
    flashcards: 600,
    summary: 600,
    ocr: 200,
    index: 1000
  }
};

async function isOwnerOrAdmin(userId: string): Promise<boolean> {
  const row = await dbGet<{ role: string }>("select role from users where id = ?", [userId]);
  return row?.role === "owner" || row?.role === "admin";
}

export class QuotaExceededError extends Error {
  feature: AiFeature;

  constructor(feature: AiFeature, message: string) {
    super(message);
    this.name = "QuotaExceededError";
    this.feature = feature;
  }
}

export function currentUsagePeriod() {
  const date = new Date();
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function getUsageSummary(userId: string, plan: HostedPlan): Promise<AiUsage[]> {
  const period = currentUsagePeriod();
  const features = Object.keys(PLAN_LIMITS.starter) as AiFeature[];
  const usage: AiUsage[] = [];

  for (const feature of features) {
    const row = await dbGet<{ count: number }>(
      "select count from ai_usage where user_id = ? and period = ? and feature = ?",
      [userId, period, feature]
    );
    const limit = PLAN_LIMITS[plan][feature];
    const used = row?.count ?? 0;
    usage.push({
      feature,
      used,
      limit,
      remaining: typeof limit === "number" ? Math.max(0, limit - used) : null
    });
  }

  return usage;
}

export async function peekQuota(userId: string, plan: HostedPlan, feature: AiFeature) {
  if (await isOwnerOrAdmin(userId)) return;
  const limit = PLAN_LIMITS[plan][feature];
  if (typeof limit !== "number") return; // unlimited
  const period = currentUsagePeriod();
  const current = await dbGet<{ count: number }>(
    "select count from ai_usage where user_id = ? and period = ? and feature = ?",
    [userId, period, feature]
  );
  if ((current?.count ?? 0) >= limit) {
    throw new QuotaExceededError(feature, `Your monthly quota for ${feature} is exhausted. Upgrade your plan for more.`);
  }
}

export async function consumeQuota(userId: string, plan: HostedPlan, feature: AiFeature) {
  const privileged = await isOwnerOrAdmin(userId);
  const limit = PLAN_LIMITS[plan][feature];

  if (!privileged) {
    if (typeof limit === "number") {
      const period = currentUsagePeriod();
      const current = await dbGet<{ id: string; count: number }>(
        "select id, count from ai_usage where user_id = ? and period = ? and feature = ?",
        [userId, period, feature]
      );
      if ((current?.count ?? 0) >= limit) {
        throw new QuotaExceededError(feature, `Your monthly quota for ${feature} is exhausted. Upgrade your plan for more.`);
      }
    }
  }

  // Always record usage for visibility in the admin dashboard, even for privileged users.
  const period = currentUsagePeriod();
  const current = await dbGet<{ id: string; count: number }>(
    "select id, count from ai_usage where user_id = ? and period = ? and feature = ?",
    [userId, period, feature]
  );
  if (current) {
    await dbRun("update ai_usage set count = count + 1, updated_at = ? where id = ?", [now(), current.id]);
  } else {
    await dbRun(
      "insert into ai_usage (id, user_id, period, feature, count, created_at, updated_at) values (?, ?, ?, ?, 1, ?, ?)",
      [id(), userId, period, feature, now(), now()]
    );
  }
}
