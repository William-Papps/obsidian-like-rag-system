import { dbGet, dbRun } from "@/lib/db";
import type { RuntimeSettings } from "@/lib/types";
import { now } from "@/lib/utils";

const DEFAULTS: RuntimeSettings = {
  selfSignupEnabled: (process.env.ALLOW_SELF_SIGNUP ?? "true").toLowerCase() !== "false",
  hostedAiEnabled: (process.env.HOSTED_AI_ENABLED ?? "true").toLowerCase() !== "false",
  emailVerificationEnabled: (process.env.EMAIL_VERIFICATION_REQUIRED ?? "false").toLowerCase() === "true"
};

export async function getRuntimeSettings(): Promise<RuntimeSettings> {
  const [selfSignupEnabled, hostedAiEnabled, emailVerificationEnabled] = await Promise.all([
    readBoolean("self_signup_enabled", DEFAULTS.selfSignupEnabled),
    readBoolean("hosted_ai_enabled", DEFAULTS.hostedAiEnabled),
    readBoolean("email_verification_enabled", DEFAULTS.emailVerificationEnabled)
  ]);
  return { selfSignupEnabled, hostedAiEnabled, emailVerificationEnabled };
}

export async function saveRuntimeSettings(input: Partial<RuntimeSettings>) {
  if (input.selfSignupEnabled !== undefined) await writeBoolean("self_signup_enabled", input.selfSignupEnabled);
  if (input.hostedAiEnabled !== undefined) await writeBoolean("hosted_ai_enabled", input.hostedAiEnabled);
  if (input.emailVerificationEnabled !== undefined) await writeBoolean("email_verification_enabled", input.emailVerificationEnabled);
  return getRuntimeSettings();
}

async function readBoolean(key: string, fallback: boolean) {
  const row = await dbGet<{ value: string }>("select value from app_settings where key = ?", [key]);
  if (!row) return fallback;
  return row.value === "true";
}

async function writeBoolean(key: string, value: boolean) {
  const exists = await dbGet<{ key: string }>("select key from app_settings where key = ?", [key]);
  if (exists) {
    await dbRun("update app_settings set value = ?, updated_at = ? where key = ?", [String(value), now(), key]);
    return;
  }
  await dbRun("insert into app_settings (key, value, created_at, updated_at) values (?, ?, ?, ?)", [key, String(value), now(), now()]);
}
