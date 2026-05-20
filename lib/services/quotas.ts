import { dbRun } from "@/lib/db";
import type { AiFeature, AiUsage } from "@/lib/types";
import { id, now } from "@/lib/utils";

export function currentUsagePeriod() {
  const date = new Date();
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function getUsageSummary(userId: string): Promise<AiUsage[]> {
  const { dbGet } = await import("@/lib/db");
  const period = currentUsagePeriod();
  const features: AiFeature[] = ["ask", "quiz", "flashcards", "summary", "ocr", "index"];
  const usage: AiUsage[] = [];

  for (const feature of features) {
    const row = await dbGet<{ count: number }>(
      "select count from ai_usage where user_id = ? and period = ? and feature = ?",
      [userId, period, feature]
    );
    usage.push({ feature, used: row?.count ?? 0, limit: null, remaining: null });
  }

  return usage;
}

// Records one usage event for admin observability. No enforcement.
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
