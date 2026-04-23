import OpenAI from "openai";
import type { AnswerResult, RetrievedChunk } from "@/lib/types";
import { getProviderSettings, readApiKey } from "@/lib/services/settings";
import { retrieveChunks } from "@/lib/rag/retrieval";

export async function answerFromNotes(
  userId: string,
  question: string,
  scope: { noteId?: string; folderId?: string | null } = {}
): Promise<AnswerResult> {
  const citations = await retrieveChunks(userId, question, { ...scope, limit: 6 });
  if (citations.length === 0 || citations[0].similarity < 0.08) {
    return {
      answer: "Not found in the indexed notes. Add or index notes that directly support this question, then try again.",
      citations,
      unsupported: true
    };
  }

  const apiKey = readApiKey(userId);
  if (!apiKey) {
    return {
      answer: `No OpenAI key is configured, so this local response is extractive only.\n\nMost relevant note evidence:\n${citations
        .slice(0, 3)
        .map((citation, index) => `${index + 1}. ${citation.excerpt}`)
        .join("\n\n")}`,
      citations,
      unsupported: false
    };
  }

  const settings = await getProviderSettings(userId);
  const client = new OpenAI({ apiKey, project: settings.projectId || undefined });
  const response = await client.chat.completions.create({
    model: settings.answerModel,
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content:
          "You answer only from the provided study notes. Do not use outside knowledge. Do not guess. Do not debug, prescribe fixes, invent explanations, or rewrite facts unless the notes explicitly support it. If the excerpts do not contain enough evidence, say: Not found in the notes. Keep the answer concise and cite source numbers like [1]."
      },
      {
        role: "user",
        content: `Question: ${question}\n\nRetrieved note excerpts:\n${formatCitations(citations)}`
      }
    ]
  });

  return {
    answer: response.choices[0]?.message.content?.trim() || "Not found in the notes.",
    citations,
    unsupported: false
  };
}

function formatCitations(citations: RetrievedChunk[]) {
  return citations.map((citation, index) => `[${index + 1}] ${citation.noteTitle}\n${citation.excerpt}`).join("\n\n");
}
