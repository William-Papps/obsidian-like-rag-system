import { dbGet, dbRun } from "@/lib/db";
import type { AiFeature, AiUsage, HostedPlan } from "@/lib/types";
import { id, now } from "@/lib/utils";

export const PLAN_LIMITS: Record<HostedPlan, Record<AiFeature, number | null>> = {
  free: {
    ask: null,
    quiz: null,
    flashcards: null,
    summary: null,
    ocr: null,
    index: null
  },
  starter: {
    ask: 200,
    quiz: 100,
    flashcards: 100,
    summary: 100,
    ocr: 50,
    index: 75
  },
  pro: {
    ask: 600,
    quiz: 300,
    flashcards: 300,
    summary: 300,
    ocr: 150,
    index: 200
  }
};

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

export async function consumeQuota(userId: string, plan: HostedPlan, feature: AiFeature) {
  const limit = PLAN_LIMITS[plan][feature];
  if (typeof limit !== "number") {
    throw new QuotaExceededError(feature, "Hosted AI is not enabled for this account.");
  }

  const period = currentUsagePeriod();
  const current = await dbGet<{ id: string; count: number }>(
    "select id, count from ai_usage where user_id = ? and period = ? and feature = ?",
    [userId, period, feature]
  );

  if ((current?.count ?? 0) >= limit) {
    throw new QuotaExceededError(feature, `Your hosted AI quota for ${feature} is exhausted this month.`);
  }

  if (current) {
    await dbRun("update ai_usage set count = count + 1, updated_at = ? where id = ?", [now(), current.id]);
    return;
  }

  await dbRun(
    "insert into ai_usage (id, user_id, period, feature, count, created_at, updated_at) values (?, ?, ?, ?, 1, ?, ?)",
    [id(), userId, period, feature, now(), now()]
  );
}
