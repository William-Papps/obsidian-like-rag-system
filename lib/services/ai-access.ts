import type { AiContext, AiFeature } from "@/lib/types";
import { userCanUseHostedAi } from "@/lib/services/billing";
import { dbGet } from "@/lib/db";
import { getProviderSettings, hostedAiAvailable, hostedProjectId, readHostedApiKey, readUserApiKey } from "@/lib/services/settings";

export class ProPlanRequiredError extends Error {
  constructor() {
    super("This feature requires a Pro plan. Upgrade in Account settings.");
    this.name = "ProPlanRequiredError";
  }
}

// Throws ProPlanRequiredError if the user cannot access Pro-only features.
// BYOK users (personal API key) always pass — they pay their own AI costs.
// Owners and admins always pass. Everyone else needs hostedPlan !== "free".
export async function requireProAccess(userId: string): Promise<void> {
  if (readUserApiKey(userId)) return;
  const row = await dbGet<{ role: string }>("select role from users where id = ?", [userId]);
  if (row?.role === "owner" || row?.role === "admin") return;
  const settings = await getProviderSettings(userId);
  if (settings.hostedPlan === "free") throw new ProPlanRequiredError();
  const allowed = await userCanUseHostedAi(userId);
  if (allowed && (await hostedAiAvailable())) return;
  throw new ProPlanRequiredError();
}

export async function resolveAiContext(userId: string, feature: AiFeature): Promise<AiContext> {
  const settings = await getProviderSettings(userId);

  const userApiKey = readUserApiKey(userId);
  if (userApiKey) {
    return {
      mode: "user",
      apiKey: userApiKey,
      projectId: settings.projectId,
      settings
    };
  }

  const hostedApiKey = (await hostedAiAvailable()) ? readHostedApiKey() : null;
  if (hostedApiKey && (await userCanUseHostedAi(userId))) {
    return {
      mode: "hosted",
      apiKey: hostedApiKey,
      projectId: hostedProjectId(),
      settings
    };
  }

  const ollamaUrl = process.env.OLLAMA_BASE_URL;
  if (ollamaUrl) {
    return {
      mode: "ollama",
      apiKey: null,
      projectId: null,
      ollamaBaseUrl: ollamaUrl,
      settings: {
        ...settings,
        embeddingModel: "nomic-embed-text",
        answerModel: "llama3.2:3b",
        visionModel: "moondream"
      }
    };
  }

  return {
    mode: "local",
    apiKey: null,
    projectId: null,
    settings
  };
}
