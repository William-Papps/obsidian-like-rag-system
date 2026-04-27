import type { AiContext, AiFeature } from "@/lib/types";
import { userCanUseHostedAi } from "@/lib/services/billing";
import { QuotaExceededError, consumeQuota } from "@/lib/services/quotas";
import { getProviderSettings, hostedAiAvailable, hostedProjectId, readHostedApiKey, readUserApiKey } from "@/lib/services/settings";

export { QuotaExceededError };

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
  if (hostedApiKey && settings.hostedPlan !== "free" && (await userCanUseHostedAi(userId))) {
    await consumeQuota(userId, settings.hostedPlan, feature);
    return {
      mode: "hosted",
      apiKey: hostedApiKey,
      projectId: hostedProjectId(),
      settings
    };
  }

  return {
    mode: "local",
    apiKey: null,
    projectId: null,
    settings
  };
}
