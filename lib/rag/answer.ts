import OpenAI from "openai";
import { z } from "zod";
import type { AnswerResult, RetrievedChunk } from "@/lib/types";
import { resolveAiContext } from "@/lib/services/ai-access";
import { retrieveChunks } from "@/lib/rag/retrieval";

const relevanceSchema = z.object({
  supported: z.boolean(),
  answer: z.string().nullable().optional(),
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
  return s.toLowerCase().replace(/[\s ]+/g, " ").replace(/[^\w\s]/g, "").trim();
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
  if (citations.length === 0) {
    return {
      answer: "Not found in the indexed notes. Add or index notes that directly support this question, then try again.",
      citations,
      unsupported: true
    };
  }

  // Default Ask returns references only (no generated paragraph). "Plain English" is a separate action.
  const supported = citations[0].similarity >= 0.08;
  return {
    answer: supported ? "References found in your notes." : "Not found in the indexed notes. Add or index notes that directly support this question, then try again.",
    citations,
    unsupported: !supported
  };
}

export async function explainFromNotes(
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
      answer: "No OpenAI key is configured for plain-language explanations. Add a hosted or personal key, then try again.",
      citations,
      unsupported: true
    };
  }

  const client = new OpenAI({ apiKey: ai.apiKey });
  const response = await client.chat.completions.create({
    model: ai.settings.answerModel,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You explain ONLY from the provided notes. Do not use outside knowledge. " +
          "Write in plain language suitable for a learner. Keep it concise. " +
          "If the excerpts do not contain enough evidence, set supported=false. " +
          "When supported=true, cite sources like [1] and include evidence quotes copied verbatim from the excerpts (exact substrings) " +
          'as evidence: Array<{source:number, quote:string}>. Return ONLY JSON: {"supported":boolean,"answer"?:string|null,"evidence"?:Array<{source:number,quote:string}>}.'
      },
      { role: "user", content: `Question: ${question}\n\nRetrieved note excerpts:\n${formatCitations(citations)}` }
    ]
  });

  const raw = response.choices[0]?.message.content?.trim() || "";
  let judged: z.infer<typeof relevanceSchema>;
  try {
    judged = relevanceSchema.parse(JSON.parse(raw));
  } catch {
    return { answer: "Not found in the notes.", citations, unsupported: true };
  }
  const answer = (judged.supported ? (judged.answer ?? "").trim() : "") || "Not found in the notes.";
  const supported = Boolean(judged.supported) && Boolean(answer) && evidenceLooksValid(citations, judged.evidence);

  return {
    answer: supported ? answer : "Not found in the notes.",
    citations,
    unsupported: !supported
  };
}

function formatCitations(citations: RetrievedChunk[]) {
  return citations.map((citation, index) => `[${index + 1}] ${citation.noteTitle}\n${citation.excerpt}`).join("\n\n");
}

