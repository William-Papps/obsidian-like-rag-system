import OpenAI from "openai";
import { resolveAiContext } from "@/lib/services/ai-access";

// Cap sent to the model. Small models (llama3.2:3b) have limited context;
// text beyond this limit is appended unchanged after the enhanced portion.
const MODEL_CHAR_LIMIT = 6000;

export async function enhanceTextStructure(userId: string, text: string): Promise<{ text: string; warning?: string }> {
  const ai = await resolveAiContext(userId, "index");

  const client = ai.ollamaBaseUrl
    ? new OpenAI({ baseURL: `${ai.ollamaBaseUrl}/v1`, apiKey: "ollama" })
    : ai.apiKey
      ? new OpenAI({ apiKey: ai.apiKey })
      : null;

  if (!client) {
    return { text, warning: "No AI provider configured — structure enhancement skipped." };
  }

  const model = ai.settings.answerModel;
  if (!model) {
    return { text, warning: "No answer model configured — structure enhancement skipped." };
  }

  const truncated = text.length > MODEL_CHAR_LIMIT;
  const input = truncated ? text.slice(0, MODEL_CHAR_LIMIT) : text;

  try {
    const response = await client.chat.completions.create({
      model,
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "You are a document formatter. Convert the plain text below into well-structured Markdown.\n" +
            "Rules:\n" +
            "- Add # headings where you see topic changes, section titles, or standalone lines that read like titles\n" +
            "- Use ## or ### for subheadings where the hierarchy is clear\n" +
            "- Convert parallel items into bullet lists using -\n" +
            "- Convert numbered sequences into numbered lists\n" +
            "- Convert tabular or aligned data into Markdown tables\n" +
            "- Preserve every fact exactly — do not add, remove, or rewrite any content\n" +
            "- Return ONLY the formatted Markdown with no explanation, preamble, or commentary"
        },
        { role: "user", content: input }
      ]
    });

    const enhanced = response.choices[0]?.message.content?.trim();
    if (!enhanced) return { text, warning: "AI returned empty output — original text kept." };

    const result = truncated ? `${enhanced}\n\n${text.slice(MODEL_CHAR_LIMIT)}` : enhanced;
    const warning = truncated
      ? "Document exceeded the structure-detection limit. Only the first portion was enhanced; the remainder was appended as-is."
      : undefined;

    return { text: result, warning };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const status = (err as { status?: number })?.status;
    if (status === 404 || /model .* not found/i.test(msg)) {
      return { text, warning: `Structure enhancement skipped: model not installed. Run: ollama pull ${model}` };
    }
    return { text, warning: `Structure enhancement failed: ${msg}` };
  }
}
