import { dbGet, dbRun } from "@/lib/db";
import { getUsageSummary } from "@/lib/services/quotas";
import type { ProviderSettings } from "@/lib/types";
import { id, now, toCamelRecord } from "@/lib/utils";

export async function getProviderSettings(userId: string): Promise<ProviderSettings> {
  const row = await dbGet("select * from provider_settings where user_id = ? and provider = 'openai'", [userId]);
  if (row) {
    const settings = await publicSettings(row);
    settings.usage = await getUsageSummary(userId);
    return settings;
  }

  const created = now();
  const settings = {
    id: id(),
    userId,
    provider: "openai" as const,
    projectId: null,
    embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
    answerModel: process.env.OPENAI_ANSWER_MODEL || "gpt-4o-mini",
    visionModel: process.env.OPENAI_VISION_MODEL || "gpt-4o-mini",
    createdAt: created,
    updatedAt: created
  };
  await dbRun(
    "insert into provider_settings (id, user_id, provider, local_secret_ref, masked_key, project_id, embedding_model, answer_model, vision_model, hosted_plan, created_at, updated_at) values (?, ?, 'openai', ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [
      settings.id,
      userId,
      null,
      null,
      settings.projectId,
      settings.embeddingModel,
      settings.answerModel,
      settings.visionModel,
      "free",
      settings.createdAt,
      settings.updatedAt
    ]
  );
  return { ...settings, usage: await getUsageSummary(userId) };
}

async function publicSettings(row: Record<string, unknown>) {
  const settings = toCamelRecord(row) as ProviderSettings & { localSecretRef?: string | null; hostedPlan?: string; hostedKeyAvailable?: boolean };
  delete settings.localSecretRef;
  delete settings.hostedPlan;
  delete settings.hostedKeyAvailable;
  return {
    ...settings,
    projectId: normalizeProjectId(settings.projectId),
    usage: [] as ProviderSettings["usage"]
  } as ProviderSettings;
}

export async function saveProviderSettings(
  userId: string,
  input: {
    projectId?: string | null;
    embeddingModel: string;
    answerModel: string;
    visionModel?: string | null;
  }
) {
  const existing = await getProviderSettings(userId);
  await dbRun(
    "update provider_settings set project_id = ?, embedding_model = ?, answer_model = ?, vision_model = ?, updated_at = ? where id = ? and user_id = ?",
    [
      normalizeProjectId(input.projectId?.trim() || null),
      input.embeddingModel,
      input.answerModel,
      input.visionModel?.trim() || null,
      now(),
      existing.id,
      userId
    ]
  );
  return getProviderSettings(userId);
}

function normalizeProjectId(projectId: string | null | undefined) {
  const trimmed = projectId?.trim();
  if (!trimmed) return null;
  return /^proj_[A-Za-z0-9_-]+$/.test(trimmed) ? trimmed : null;
}
