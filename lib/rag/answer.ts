import OpenAI from "openai";
import { z } from "zod";
import type { AnswerResult, RetrievedChunk } from "@/lib/types";
import { resolveAiContext } from "@/lib/services/ai-access";
import { retrieveChunks } from "@/lib/rag/retrieval";

export type AskStreamEvent =
  | { type: "citations"; data: RetrievedChunk[] }
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
    const citations = await retrieveChunks(userId, question, { ...scope, limit: 6 }, ai);
    send({ type: "citations", data: citations });

    if (citations.length === 0 || citations[0].similarity < 0.08) {
      send({ type: "chunk", data: "Not found in the indexed notes. Add or index notes that directly support this question, then try again." });
      send({ type: "done" });
      return;
    }

    if (!ai.apiKey) {
      send({ type: "chunk", data: "Add an OpenAI key in Settings to generate answers. Your best sources are shown below." });
      send({ type: "done" });
      return;
    }

    const client = new OpenAI({ apiKey: ai.apiKey });
    const stream = await client.chat.completions.create({
      model: ai.settings.answerModel,
      temperature: 0.1,
      stream: true,
      messages: [
        {
          role: "system",
          content:
            "You answer ONLY from the provided note excerpts. Do not use outside knowledge. Do not guess. " +
            "Write 2-4 bullet points as short, clear, complete sentences (start each with '- '). " +
            "Focus on what directly answers the question. " +
            "If the excerpts do not contain enough evidence, write only: NOT_FOUND"
        },
        { role: "user", content: `Question: ${question}\n\nNote excerpts:\n${formatCitations(citations)}` }
      ]
    });

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content;
      if (token) send({ type: "chunk", data: token });
    }

    send({ type: "done" });
  } catch (err) {
    send({ type: "error", data: err instanceof Error ? err.message : "Stream failed" });
    controller.close();
    throw err;
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
      answer: "Not found in the indexed notes. Add or index notes that directly support this question, then try again.",
      citations,
      unsupported: true
    };
  }

  if (!ai.apiKey) {
    return {
      answer: "Add an OpenAI key in Settings to generate answers. Your best sources are shown below.",
      citations,
      unsupported: true
    };
  }

  const client = new OpenAI({ apiKey: ai.apiKey });
  const response = await client.chat.completions.create({
    model: ai.settings.answerModel,
    temperature: 0.1,
    response_format: { type: "json_object" },
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
    judged = answerSchema.parse(JSON.parse(raw));
  } catch {
    return { answer: "Not found in the indexed notes.", citations, unsupported: true };
  }

  const points = judged.supported && judged.points?.length ? judged.points : [];
  const valid = points.length > 0 && evidenceLooksValid(citations, judged.evidence);

  if (!valid) {
    return { answer: "Not found in the indexed notes.", citations, unsupported: true };
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

  if (!ai.apiKey) {
    return {
      answer: "No OpenAI key is configured for paraphrasing. Add a hosted or personal key, then try again.",
      citations: [],
      unsupported: true
    };
  }

  const client = new OpenAI({ apiKey: ai.apiKey });
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
