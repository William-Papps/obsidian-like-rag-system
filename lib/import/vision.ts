import OpenAI from "openai";
import type { AiContext } from "@/lib/types";
import { resolveAiContext } from "@/lib/services/ai-access";

export async function extractTextFromImage(
  userId: string,
  input: { bytes: Buffer; contentType: string; label: string },
  context?: AiContext
): Promise<{ text: string | null; warning?: string }> {
  const ai = context ?? (await resolveAiContext(userId, "ocr"));
  if (!ai.apiKey) {
    return { text: null, warning: `Skipped ${input.label}: configure an OpenAI API key to extract text from images.` };
  }

  const model = ai.settings.visionModel || ai.settings.answerModel;
  if (!model) {
    return { text: null, warning: `Skipped ${input.label}: configure a vision-capable model in Settings.` };
  }

  const client = new OpenAI({ apiKey: ai.apiKey, project: ai.projectId || undefined });
  const dataUrl = `data:${input.contentType};base64,${input.bytes.toString("base64")}`;
  const response = await client.chat.completions.create({
    model,
    temperature: 0,
    messages: [
      {
        role: "system",
        content:
          "Extract only text that is visible in the image. Return plain Markdown-ready text with line breaks preserved where useful. Do not explain, summarize, infer, or add outside knowledge. If there is no readable text, return exactly: [no readable text found]"
      },
      {
        role: "user",
        content: [
          { type: "text", text: `Read the text from this image: ${input.label}` },
          { type: "image_url", image_url: { url: dataUrl, detail: "high" } }
        ]
      }
    ]
  });

  const text = response.choices[0]?.message.content?.trim() || "";
  if (!text || text === "[no readable text found]") {
    return { text: null, warning: `No readable text found in ${input.label}.` };
  }
  return { text };
}
