import OpenAI from "openai";
import { z } from "zod";
import type { AiContext, AnswerResult, RetrievedChunk } from "@/lib/types";
import { resolveAiContext } from "@/lib/services/ai-access";
import { retrieveChunks } from "@/lib/rag/retrieval";
import { retrieveMultiPass, type RetrievalMeta } from "@/lib/rag/retrieval";
import { recordChunkEvents } from "@/lib/services/chunk-feedback";
import { consumeQuota, recordUsage } from "@/lib/services/quotas";
import { dbGet } from "@/lib/db";
import { reindexNotes } from "@/lib/rag/indexing";

function makeClient(ai: AiContext): OpenAI | null {
  if (ai.ollamaBaseUrl) return new OpenAI({ baseURL: `${ai.ollamaBaseUrl}/v1`, apiKey: "ollama" });
  if (ai.apiKey) return new OpenAI({ apiKey: ai.apiKey });
  return null;
}

function ollamaModelNotFound(err: unknown): string | null {
  const msg = err instanceof Error ? err.message : String(err);
  const status = (err as { status?: number })?.status;
  if (status === 404 || /model .* not found/i.test(msg) || /pull the model/i.test(msg)) {
    const match = msg.match(/model ['"]?([^'"]+)['"]? not found/i);
    const modelName = match ? match[1] : "the required model";
    return `Ollama model not installed: ${modelName}. On the server, run: ollama pull ${modelName}`;
  }
  return null;
}

export type AskStreamEvent =
  | { type: "citations"; data: RetrievedChunk[]; meta?: RetrievalMeta }
  | { type: "chunk"; data: string }
  | { type: "done" }
  | { type: "error"; data: string };

function sseEncode(event: AskStreamEvent, enc: TextEncoder) {
  return enc.encode(`data: ${JSON.stringify(event)}\n\n`);
}

export async function streamAnswerFromNotes(
  userId: string,
  question: string,
  scope: { noteId?: string; folderId?: string | null },
  controller: ReadableStreamDefaultController<Uint8Array>
) {
  const enc = new TextEncoder();
  const send = (ev: AskStreamEvent) => controller.enqueue(sseEncode(ev, enc));

  try {
    const ai = await resolveAiContext(userId, "ask");
    const currentProvider = ai.ollamaBaseUrl ? "ollama" : ai.apiKey ? "openai" : "local";

    // Detect provider mismatch: notes indexed under a different provider (e.g. local TF-IDF)
    // produce near-zero cosine scores against the current provider's query vector.
    // Auto-trigger a background re-index and tell the user to try again.
    const [providerChunks, totalChunks] = await Promise.all([
      dbGet<{ count: number }>(
        "select count(*) as count from chunks where user_id = ? and coalesce(vector_provider, 'local') = ?",
        [userId, currentProvider]
      ),
      dbGet<{ count: number }>("select count(*) as count from chunks where user_id = ?", [userId])
    ]);
    if ((totalChunks?.count ?? 0) > 0 && !(providerChunks?.count ?? 0)) {
      reindexNotes(userId).catch(console.error);
      send({ type: "chunk", data: "Your notes are being re-indexed for the current AI provider. This may take a moment — please try again shortly." });
      send({ type: "done" });
      return;
    }

    const { chunks: citations, meta } = await retrieveMultiPass(userId, question, { ...scope, limit: 6 }, ai);
    send({ type: "citations", data: citations, meta });
    void recordRetrievalEvents(userId, citations, meta);

    if (meta.resultCount === 0 || meta.topScore < 0.08) {
      send({ type: "chunk", data: "Not found in the knowledge base. Add or index documents that directly support this question, then try again." });
      send({ type: "done" });
      return;
    }

    const client = makeClient(ai);
    if (!client) {
      send({ type: "chunk", data: "Add an OpenAI key in Settings to generate answers. Your best sources are shown below." });
      send({ type: "done" });
      return;
    }

    if (ai.mode === "hosted") {
      await consumeQuota(userId, ai.settings.hostedPlan, "ask");
    } else {
      await recordUsage(userId, "ask");
    }

    if (ai.ollamaBaseUrl) {
      // Stream tokens directly for Ollama — small models can't reliably output valid JSON,
      // and waiting for the full response before displaying anything makes it feel very slow.
      const confidenceCaveat = meta.lowConfidence
        ? "The retrieved excerpts have low similarity to the question. If they don't directly answer it, write only: Not found in the knowledge base.\n\n"
        : "";
      try {
        const stream = await client.chat.completions.create({
          model: ai.settings.answerModel,
          temperature: 0.1,
          stream: true,
          messages: [
            {
              role: "system",
              content:
                confidenceCaveat +
                "Answer ONLY from the provided note excerpts. Do not use outside knowledge. Do not guess. " +
                "Write 2-4 bullet points as short, clear sentences — start each with '- '. " +
                "If the excerpts do not contain enough evidence, write only: Not found in the knowledge base."
            },
            { role: "user", content: `Question: ${question}\n\nNote excerpts:\n${formatCitations(citations)}` }
          ]
        });
        for await (const streamChunk of stream) {
          const token = streamChunk.choices[0]?.delta?.content;
          if (token) send({ type: "chunk", data: token });
        }
      } catch (ollamaErr) {
        const notFound = ollamaModelNotFound(ollamaErr);
        if (notFound) {
          send({ type: "chunk", data: notFound });
          send({ type: "done" });
          return;
        }
        throw ollamaErr;
      }
    } else {
      // Structured JSON mode for OpenAI — reliable output, fake-stream the formatted result.
      const judged = await answerFromCitations(userId, ai, question, citations, meta);
      for (let i = 0; i < judged.answer.length; i += 120) {
        send({ type: "chunk", data: judged.answer.slice(i, i + 120) });
      }
    }

    send({ type: "done" });
  } catch (err) {
    const notFound = ollamaModelNotFound(err);
    if (notFound) {
      send({ type: "chunk", data: notFound });
      send({ type: "done" });
      return;
    }
    send({ type: "error", data: err instanceof Error ? err.message : "Stream failed" });
    controller.close();
    throw err;
  }
}

async function recordRetrievalEvents(userId: string, chunks: RetrievedChunk[], meta: RetrievalMeta) {
  try {
    const events = chunks.flatMap((c) => {
      const evs: Array<{ chunkId: string; noteId: string | null; eventType: "retrieved" | "weak_retrieval" }> = [
        { chunkId: c.chunkId, noteId: c.noteId, eventType: "retrieved" }
      ];
      if (meta.lowConfidence) {
        evs.push({ chunkId: c.chunkId, noteId: c.noteId, eventType: "weak_retrieval" });
      }
      return evs;
    });
    if (events.length) await recordChunkEvents(userId, events);
  } catch {
    // Never block the answer stream on feedback logging.
  }
}

const answerSchema = z.object({
  supported: z.boolean(),
  points: z.array(z.string().min(1)).optional(),
  evidence: z
    .array(
      z.object({
        source: z.number().int().min(1),
        quote: z.string().min(1)
      })
    )
    .optional()
});

function normalizeForMatch(s: string) {
  return s.toLowerCase().replace(/[\s ]+/g, " ").replace(/[^\w\s]/g, "").trim();
}

function evidenceLooksValid(citations: RetrievedChunk[], evidence?: { source: number; quote: string }[]) {
  if (!evidence || evidence.length === 0) return false;
  for (const item of evidence) {
    const idx = item.source - 1;
    const citation = citations[idx];
    if (!citation) return false;
    if (!normalizeForMatch(citation.excerpt).includes(normalizeForMatch(item.quote))) return false;
  }
  return true;
}

export async function answerFromNotes(
  userId: string,
  question: string,
  scope: { noteId?: string; folderId?: string | null } = {}
): Promise<AnswerResult> {
  const ai = await resolveAiContext(userId, "ask");
  const citations = await retrieveChunks(userId, question, { ...scope, limit: 6 }, ai);

  if (citations.length === 0 || citations[0].similarity < 0.08) {
    return {
      answer: "Not found in the knowledge base. Add or index documents that directly support this question, then try again.",
      citations,
      unsupported: true
    };
  }

  const client = makeClient(ai);
  if (!client) {
    return {
      answer: "Add an OpenAI key in Settings to generate answers. Your best sources are shown below.",
      citations,
      unsupported: true
    };
  }

  if (ai.mode === "hosted") {
    await consumeQuota(userId, ai.settings.hostedPlan, "ask");
  }

  const useJsonFormat = !ai.ollamaBaseUrl;
  const response = await client.chat.completions.create({
    model: ai.settings.answerModel,
    temperature: 0.1,
    ...(useJsonFormat ? { response_format: { type: "json_object" as const } } : {}),
    messages: [
      {
        role: "system",
        content:
          "You answer ONLY from the provided note excerpts. Do not use outside knowledge. Do not guess. " +
          "Write 2-4 bullet points as short, clear, complete sentences. Cite sources inline like [1]. " +
          "Focus on what directly answers the question. " +
          "If the excerpts do not contain enough evidence, set supported=false. " +
          "When supported=true, include evidence quotes copied verbatim (exact substrings) from the excerpts. " +
          'Return ONLY JSON: {"supported":boolean,"points":string[],"evidence":Array<{source:number,quote:string}>}.'
      },
      { role: "user", content: `Question: ${question}\n\nNote excerpts:\n${formatCitations(citations)}` }
    ]
  });

  const raw = response.choices[0]?.message.content?.trim() || "";
  let judged: z.infer<typeof answerSchema>;
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    judged = answerSchema.parse(JSON.parse(jsonMatch ? jsonMatch[0] : raw));
  } catch {
    return { answer: "Not found in the knowledge base.", citations, unsupported: true };
  }

  const points = judged.supported && judged.points?.length ? judged.points : [];
  const valid = points.length > 0 && evidenceLooksValid(citations, judged.evidence);

  if (!valid) {
    return { answer: "Not found in the knowledge base.", citations, unsupported: true };
  }

  return {
    answer: points.map((p) => `- ${p}`).join("\n"),
    citations,
    unsupported: false
  };
}

export async function explainFromNotes(
  userId: string,
  question: string,
  answer: string
): Promise<AnswerResult> {
  const ai = await resolveAiContext(userId, "ask");

  const client = makeClient(ai);
  if (!client) {
    return {
      answer: "No OpenAI key is configured for paraphrasing. Add a hosted or personal key, then try again.",
      citations: [],
      unsupported: true
    };
  }

  if (ai.mode === "hosted") {
    await consumeQuota(userId, ai.settings.hostedPlan, "ask");
  }

  const response = await client.chat.completions.create({
    model: ai.settings.answerModel,
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content:
          "You are given an answer derived from study notes. Rewrite it as a simple, concrete example a beginner would understand. " +
          "Use plain English. Keep it under 120 words. " +
          "Do not add information not present in the original answer. " +
          "Do not use bullet points — write 1-2 short paragraphs or show a worked example."
      },
      { role: "user", content: `Question: ${question}\n\nAnswer from notes:\n${answer}` }
    ]
  });

  const paraphrase = response.choices[0]?.message.content?.trim() || "";
  return {
    answer: paraphrase || "Could not generate a paraphrase.",
    citations: [],
    unsupported: !paraphrase
  };
}

function formatCitations(citations: RetrievedChunk[]) {
  return citations.map((citation, index) => `[${index + 1}] ${citation.noteTitle}\n${citation.excerpt}`).join("\n\n");
}

async function answerFromCitations(
  userId: string,
  ai: AiContext,
  question: string,
  citations: RetrievedChunk[],
  meta: RetrievalMeta
): Promise<AnswerResult> {
  if (meta.resultCount === 0 || meta.topScore < 0.08) {
    return {
      answer: "Not found in the knowledge base. Add or index documents that directly support this question, then try again.",
      citations,
      unsupported: true
    };
  }

  const client = makeClient(ai);
  if (!client) {
    return {
      answer: "Add an OpenAI key in Settings to generate answers. Your best sources are shown below.",
      citations,
      unsupported: true
    };
  }

  if (ai.mode === "hosted") {
    await consumeQuota(userId, ai.settings.hostedPlan, "ask");
  }

  const confidenceCaveat = meta.lowConfidence
    ? "NOTE: The retrieved excerpts have low similarity to the question. If the excerpts do not contain enough evidence, set supported=false.\n\n"
    : "";

  const useJsonFormat = !ai.ollamaBaseUrl;
  const response = await client.chat.completions.create({
    model: ai.settings.answerModel,
    temperature: 0.1,
    ...(useJsonFormat ? { response_format: { type: "json_object" as const } } : {}),
    messages: [
      {
        role: "system",
        content:
          confidenceCaveat +
          "You answer ONLY from the provided note excerpts. Do not use outside knowledge. Do not guess. " +
          "Write 2-4 bullet points as short, clear, complete sentences. Cite sources inline like [1]. " +
          "If the excerpts do not contain enough evidence, set supported=false. " +
          "When supported=true, include evidence quotes copied verbatim (exact substrings) from the excerpts. " +
          'Return ONLY JSON: {"supported":boolean,"points":string[],"evidence":Array<{source:number,quote:string}>}.'
      },
      { role: "user", content: `Question: ${question}\n\nNote excerpts:\n${formatCitations(citations)}` }
    ]
  });

  const raw = response.choices[0]?.message.content?.trim() || "";
  let judged: z.infer<typeof answerSchema>;
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    judged = answerSchema.parse(JSON.parse(jsonMatch ? jsonMatch[0] : raw));
  } catch {
    return { answer: "Not found in the knowledge base.", citations, unsupported: true };
  }

  const points = judged.supported && judged.points?.length ? judged.points : [];
  const valid = points.length > 0 && evidenceLooksValid(citations, judged.evidence);

  if (!valid) {
    return { answer: "Not found in the knowledge base.", citations, unsupported: true };
  }

  return {
    answer: points.map((p) => `- ${p}`).join("\n"),
    citations,
    unsupported: false
  };
}
