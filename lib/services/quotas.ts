import { dbGet, dbRun, dbGetSync, dbRunSync, dbTransaction } from "@/lib/db";
import type { AiFeature, AiUsage, HostedPlan } from "@/lib/types";
import { id, now } from "@/lib/utils";

export const PLAN_LIMITS: Record<HostedPlan, Record<AiFeature, number | null>> = {
  free: {
    ask: 400,
    quiz: 200,
    flashcards: 200,
    summary: 200,
    ocr: 50,
    index: 500
  },
  starter: {
    ask: 800,
    quiz: 350,
    flashcards: 350,
    summary: 350,
    ocr: 100,
    index: 700
  },
  pro: {
    ask: 2000,
    quiz: 800,
    flashcards: 800,
    summary: 800,
    ocr: 300,
    index: 2000
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

// Records one usage event without enforcing any limit. Use for BYOK and Ollama
// users so admin usage stats remain accurate across all AI modes.
export async function recordUsage(userId: string, feature: AiFeature): Promise<void> {
  const period = currentUsagePeriod();
  await dbRun(
    `insert into ai_usage (id, user_id, period, feature, count, created_at, updated_at)
     values (?, ?, ?, ?, 1, ?, ?)
     on conflict(user_id, period, feature) do update set
       count = count + 1,
       updated_at = excluded.updated_at`,
    [id(), userId, period, feature, now(), now()]
  );
}

export async function consumeQuota(userId: string, plan: HostedPlan, feature: AiFeature) {
  const privileged = await isOwnerOrAdmin(userId);
  const limit = PLAN_LIMITS[plan][feature];

  const period = currentUsagePeriod();

  // Always record usage for visibility in the admin dashboard, even for privileged users.
  // Use a write transaction to avoid concurrent read/modify/write races.
  if (!privileged && typeof limit === "number") {
    dbTransaction(() => {
      const current = dbGetSync<{ id: string; count: number }>(
        "select id, count from ai_usage where user_id = ? and period = ? and feature = ?",
        [userId, period, feature]
      );
      const used = current?.count ?? 0;
      if (used >= limit) {
        throw new QuotaExceededError(feature, `Your monthly quota for ${feature} is exhausted. Upgrade your plan for more.`);
      }
      if (current) {
        dbRunSync("update ai_usage set count = count + 1, updated_at = ? where id = ?", [now(), current.id]);
      } else {
        dbRunSync(
          "insert into ai_usage (id, user_id, period, feature, count, created_at, updated_at) values (?, ?, ?, ?, 1, ?, ?)",
          [id(), userId, period, feature, now(), now()]
        );
      }
    });
    return;
  }

  await dbRun(
    `insert into ai_usage (id, user_id, period, feature, count, created_at, updated_at)
     values (?, ?, ?, ?, 1, ?, ?)
     on conflict(user_id, period, feature) do update set
       count = count + 1,
       updated_at = excluded.updated_at`,
    [id(), userId, period, feature, now(), now()]
  );
}
