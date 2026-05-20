import type { AiContext, AiFeature } from "@/lib/types";
import { getProviderSettings } from "@/lib/services/settings";

export async function resolveAiContext(userId: string, _feature: AiFeature): Promise<AiContext> {
  const settings = await getProviderSettings(userId);

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
