import type { Flashcard, QuizQuestion, RetrievedChunk } from "@/lib/types";
import { retrieveChunks } from "@/lib/rag/retrieval";

export async function extractiveSummary(userId: string, scope: { noteId?: string; folderId?: string | null }) {
  const chunks = await retrieveChunks(userId, "main definitions key concepts causes effects examples", { ...scope, limit: 7 });
  return chunks.map((source, index) => ({
    id: source.chunkId,
    label: `Excerpt ${index + 1}`,
    source,
    text: source.excerpt
  }));
}

export async function generateQuiz(userId: string, scope: { noteId?: string; folderId?: string | null }): Promise<QuizQuestion[]> {
  const chunks = await retrieveChunks(userId, "definition concept explain compare cause effect process", { ...scope, limit: 6 });
  return chunks.map((source) => {
    const answer = bestSentence(source);
    return {
      question: `According to ${source.noteTitle}, what should you remember about: "${answer.slice(0, 80)}"?`,
      answer,
      source
    };
  });
}

export async function generateFlashcards(userId: string, scope: { noteId?: string; folderId?: string | null }): Promise<Flashcard[]> {
  const chunks = await retrieveChunks(userId, "term definition key fact example", { ...scope, limit: 8 });
  return chunks.map((source) => {
    const answer = bestSentence(source);
    return {
      prompt: `Recall the source fact from ${source.noteTitle}: ${answer.split(/\s+/).slice(0, 8).join(" ")}…`,
      answer,
      source
    };
  });
}

function bestSentence(source: RetrievedChunk) {
  const sentences = source.excerpt
    .replace(/^Note:.*$/gm, "")
    .replace(/^Section:.*$/gm, "")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 40);
  return sentences[0] || source.excerpt;
}
