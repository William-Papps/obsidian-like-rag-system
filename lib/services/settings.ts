import fs from "fs";
import path from "path";
import { dbGet, dbRun } from "@/lib/db";
import { decryptSecret, encryptSecret } from "@/lib/secrets";
import { getUsageSummary } from "@/lib/services/quotas";
import { getRuntimeSettings } from "@/lib/services/runtime-settings";
import type { HostedPlan, ProviderSettings } from "@/lib/types";
import { id, maskApiKey, now, toCamelRecord } from "@/lib/utils";

function secretPath(userId: string) {
  const dir = path.join(process.cwd(), "data", "secrets");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${userId}-openai.key`);
}

export async function getProviderSettings(userId: string): Promise<ProviderSettings> {
  const row = await dbGet("select * from provider_settings where user_id = ? and provider = 'openai'", [userId]);
  if (row) {
    const settings = await publicSettings(row);
    settings.usage = await getUsageSummary(userId, settings.hostedPlan);
    return settings;
  }

  const created = now();
  const settings = {
    id: id(),
    userId,
    provider: "openai" as const,
    maskedKey: null,
    projectId: null,
    embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
    answerModel: process.env.OPENAI_ANSWER_MODEL || "gpt-4o-mini",
    visionModel: process.env.OPENAI_VISION_MODEL || "gpt-4o-mini",
    hostedPlan: "free" as HostedPlan,
    createdAt: created,
    updatedAt: created
  };
  await dbRun(
    "insert into provider_settings (id, user_id, provider, local_secret_ref, masked_key, project_id, embedding_model, answer_model, vision_model, hosted_plan, created_at, updated_at) values (?, ?, 'openai', ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [
      settings.id,
      userId,
      null,
      settings.maskedKey,
      settings.projectId,
      settings.embeddingModel,
      settings.answerModel,
      settings.visionModel,
      settings.hostedPlan,
      settings.createdAt,
      settings.updatedAt
    ]
  );
  return { ...settings, hostedKeyAvailable: await hostedAiAvailable(), usage: await getUsageSummary(userId, settings.hostedPlan) };
}

async function publicSettings(row: Record<string, unknown>) {
  const settings = toCamelRecord(row) as ProviderSettings & { localSecretRef?: string | null };
  delete settings.localSecretRef;
  const hostedPlan = normalizeHostedPlan(settings.hostedPlan);
  return {
    ...settings,
    hostedPlan,
    hostedKeyAvailable: await hostedAiAvailable(),
    usage: [] as ProviderSettings["usage"]
  } as ProviderSettings;
}

export function readUserApiKey(userId: string): string | null {
  const file = secretPath(userId);
  if (!fs.existsSync(file)) return null;
  return decryptSecret(fs.readFileSync(file, "utf8").trim());
}

export function readHostedApiKey() {
  return process.env.HOSTED_OPENAI_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim() || null;
}

export function hostedProjectId() {
  return process.env.HOSTED_OPENAI_PROJECT_ID?.trim() || process.env.OPENAI_PROJECT_ID?.trim() || null;
}

export async function hostedAiAvailable() {
  const runtime = await getRuntimeSettings();
  return runtime.hostedAiEnabled && Boolean(readHostedApiKey());
}

export async function saveProviderSettings(
  userId: string,
  input: {
    apiKey?: string;
    clearApiKey?: boolean;
    projectId?: string | null;
    embeddingModel: string;
    answerModel: string;
    visionModel?: string | null;
    hostedPlan?: HostedPlan;
  }
) {
  const existing = await getProviderSettings(userId);
  let maskedKey = existing.maskedKey;
  let localSecretRef = null as string | null;
  if (input.clearApiKey) {
    const file = secretPath(userId);
    if (fs.existsSync(file)) fs.unlinkSync(file);
    maskedKey = null;
    localSecretRef = null;
  }
  if (input.apiKey?.trim()) {
    fs.writeFileSync(secretPath(userId), encryptSecret(input.apiKey.trim()), { encoding: "utf8", mode: 0o600 });
    maskedKey = maskApiKey(input.apiKey);
    localSecretRef = `file:data/secrets/${userId}-openai.key`;
  }
  await dbRun(
    "update provider_settings set local_secret_ref = coalesce(?, local_secret_ref), masked_key = ?, project_id = ?, embedding_model = ?, answer_model = ?, vision_model = ?, hosted_plan = ?, updated_at = ? where id = ? and user_id = ?",
    [
      localSecretRef,
      maskedKey,
      input.projectId?.trim() || null,
      input.embeddingModel,
      input.answerModel,
      input.visionModel?.trim() || null,
      normalizeHostedPlan(input.hostedPlan ?? existing.hostedPlan),
      now(),
      existing.id,
      userId
    ]
  );
  const next = await getProviderSettings(userId);
  next.usage = await getUsageSummary(userId, next.hostedPlan);
  return next;
}

export async function setHostedPlan(userId: string, hostedPlan: HostedPlan) {
  const existing = await getProviderSettings(userId);
  await dbRun("update provider_settings set hosted_plan = ?, updated_at = ? where id = ? and user_id = ?", [
    normalizeHostedPlan(hostedPlan),
    now(),
    existing.id,
    userId
  ]);
  return getProviderSettings(userId);
}

function normalizeHostedPlan(plan: HostedPlan | string | undefined | null): HostedPlan {
  return plan === "starter" || plan === "pro" ? plan : "free";
}
