import fs from "fs";
import path from "path";
import { dbGet, dbRun } from "@/lib/db";
import type { ProviderSettings } from "@/lib/types";
import { id, maskApiKey, now, toCamelRecord } from "@/lib/utils";

function secretPath(userId: string) {
  const dir = path.join(process.cwd(), "data", "secrets");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${userId}-openai.key`);
}

export async function getProviderSettings(userId: string): Promise<ProviderSettings> {
  const row = await dbGet("select * from provider_settings where user_id = ? and provider = 'openai'", [userId]);
  if (row) return publicSettings(row);

  const created = now();
  const settings = {
    id: id(),
    userId,
    provider: "openai" as const,
    maskedKey: process.env.OPENAI_API_KEY ? maskApiKey(process.env.OPENAI_API_KEY) : null,
    projectId: process.env.OPENAI_PROJECT_ID || null,
    embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
    answerModel: process.env.OPENAI_ANSWER_MODEL || "gpt-4o-mini",
    visionModel: process.env.OPENAI_VISION_MODEL || "gpt-4o-mini",
    createdAt: created,
    updatedAt: created
  };
  await dbRun(
    "insert into provider_settings (id, user_id, provider, local_secret_ref, masked_key, project_id, embedding_model, answer_model, vision_model, created_at, updated_at) values (?, ?, 'openai', ?, ?, ?, ?, ?, ?, ?, ?)"
  , [
    settings.id,
    userId,
    process.env.OPENAI_API_KEY ? "env:OPENAI_API_KEY" : null,
    settings.maskedKey,
    settings.projectId,
    settings.embeddingModel,
    settings.answerModel,
    settings.visionModel,
    settings.createdAt,
    settings.updatedAt
  ]);
  return settings;
}

function publicSettings(row: Record<string, unknown>): ProviderSettings {
  const settings = toCamelRecord(row) as ProviderSettings & { localSecretRef?: string | null };
  delete settings.localSecretRef;
  return settings;
}

export function readApiKey(userId: string): string | null {
  const envKey = process.env.OPENAI_API_KEY;
  if (envKey) return envKey;
  const file = secretPath(userId);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8").trim() : null;
}

export async function saveProviderSettings(
  userId: string,
  input: { apiKey?: string; projectId?: string | null; embeddingModel: string; answerModel: string; visionModel?: string | null }
) {
  const existing = await getProviderSettings(userId);
  let maskedKey = existing.maskedKey;
  let localSecretRef = null as string | null;
  if (input.apiKey?.trim()) {
    fs.writeFileSync(secretPath(userId), input.apiKey.trim(), { encoding: "utf8", mode: 0o600 });
    maskedKey = maskApiKey(input.apiKey);
    localSecretRef = `file:data/secrets/${userId}-openai.key`;
  }
  await dbRun(
    "update provider_settings set local_secret_ref = coalesce(?, local_secret_ref), masked_key = ?, project_id = ?, embedding_model = ?, answer_model = ?, vision_model = ?, updated_at = ? where id = ? and user_id = ?",
    [
      localSecretRef,
      maskedKey,
      input.projectId?.trim() || null,
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
