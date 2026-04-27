import OpenAI from "openai";
import type { SqlValue } from "sql.js";
import type { AiContext, Flashcard, QuizQuestion, RetrievedChunk } from "@/lib/types";
import { dbAll } from "@/lib/db";
import { listDescendantFolderIds } from "@/lib/services/folders";
import { retrieveChunks } from "@/lib/rag/retrieval";
import { resolveAiContext } from "@/lib/services/ai-access";

export async function extractiveSummary(userId: string, scope: { noteId?: string; folderId?: string | null }) {
  const ai = await resolveAiContext(userId, "summary");
  const chunks = await retrieveChunks(userId, "main definitions key concepts causes effects examples", { ...scope, limit: 7 }, ai);
  return chunks.map((source, index) => ({
    id: source.chunkId,
    label: `Excerpt ${index + 1}`,
    source,
    text: source.excerpt
  }));
}

export async function generateQuiz(userId: string, scope: { noteId?: string; folderId?: string | null }): Promise<QuizQuestion[]> {
  const ai = await resolveAiContext(userId, "quiz");
  const source = await pickStudyChunk(userId, scope);
  if (!source) return [];

  const answer = bestSentence(source);
  return [
    {
      question: await buildStudyPrompt(ai, source, answer, "quiz"),
      answer,
      source
    }
  ];
}

export async function generateFlashcards(userId: string, scope: { noteId?: string; folderId?: string | null }): Promise<Flashcard[]> {
  const ai = await resolveAiContext(userId, "flashcards");
  const source = await pickStudyChunk(userId, scope);
  if (!source) return [];

  const answer = bestSentence(source);
  return [
    {
      prompt: await buildStudyPrompt(ai, source, answer, "flashcard"),
      answer,
      source
    }
  ];
}

async function pickStudyChunk(userId: string, scope: { noteId?: string; folderId?: string | null }) {
  const chunks = await listStudyChunks(userId, scope);
  if (!chunks.length) return null;

  const weighted = chunks
    .map((chunk) => ({ chunk, score: studyChunkScore(chunk) + Math.random() * 0.35 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(chunks.length, 12));

  return weighted[Math.floor(Math.random() * weighted.length)]?.chunk ?? null;
}

async function listStudyChunks(userId: string, scope: { noteId?: string; folderId?: string | null }) {
  const params: SqlValue[] = [userId];
  let where = "c.user_id = ?";

  if (scope.noteId) {
    where += " and c.note_id = ?";
    params.push(scope.noteId);
  }

  if (scope.folderId !== undefined) {
    if (scope.folderId === null) {
      where += " and n.folder_id is null";
    } else {
      const folderIds = await listDescendantFolderIds(userId, scope.folderId);
      if (!folderIds.length) return [];
      where += ` and n.folder_id in (${folderIds.map(() => "?").join(", ")})`;
      params.push(...folderIds);
    }
  }

  const rows = await dbAll<{ id: string; note_id: string; title: string; chunk_text: string }>(
    `select c.id, c.note_id, c.chunk_text, n.title
     from chunks c
     join notes n on n.id = c.note_id and n.user_id = c.user_id
     where ${where}`,
    params
  );

  return rows
    .map((row) => ({
      chunkId: row.id,
      noteId: row.note_id,
      noteTitle: row.title,
      excerpt: row.chunk_text,
      similarity: 1
    }))
    .filter((chunk) => cleanExcerpt(chunk.excerpt).length >= 40);
}

function studyChunkScore(chunk: RetrievedChunk) {
  const excerpt = cleanExcerpt(chunk.excerpt);
  const sentenceCount = excerpt.split(/(?<=[.!?])\s+/).filter(Boolean).length;
  const headingBonus = extractSection(chunk.excerpt) ? 0.4 : 0;
  const lengthScore = Math.min(excerpt.length, 280) / 280;
  return headingBonus + lengthScore + Math.min(sentenceCount, 3) * 0.12;
}

function bestSentence(source: RetrievedChunk) {
  const sentences = cleanExcerpt(source.excerpt)
    .split(/(?<=[.!?])\s+|\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 30);
  return sentences[0] || cleanExcerpt(source.excerpt);
}

async function buildStudyPrompt(
  ai: AiContext,
  source: RetrievedChunk,
  answer: string,
  mode: "quiz" | "flashcard"
) {
  if (!ai.apiKey) return fallbackPrompt(source, answer, mode);

  try {
    const client = new OpenAI({ apiKey: ai.apiKey, project: ai.projectId || undefined });
    const response = await client.chat.completions.create({
      model: ai.settings.answerModel,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            mode === "quiz"
              ? "You create one concise revision quiz question from the provided note excerpt. Use only the excerpt, note title, and optional section label. Do not quote metadata like 'Note:' or 'Section:'. Do not paste long source text into the question. Ask about the concept in natural wording. Return JSON with key 'prompt'."
              : "You create one concise flashcard prompt from the provided note excerpt. Use only the excerpt, note title, and optional section label. Do not quote metadata like 'Note:' or 'Section:'. Do not paste long source text into the prompt. Make it a natural study cue. Return JSON with key 'prompt'."
        },
        {
          role: "user",
          content: JSON.stringify({
            noteTitle: source.noteTitle,
            section: extractSection(source.excerpt),
            sourceExcerpt: cleanExcerpt(source.excerpt),
            answer
          })
        }
      ]
    });

    const raw = response.choices[0]?.message.content?.trim();
    if (!raw) return fallbackPrompt(source, answer, mode);

    const parsed = JSON.parse(raw) as { prompt?: string };
    const prompt = parsed.prompt?.trim();
    return prompt ? trimPrompt(prompt) : fallbackPrompt(source, answer, mode);
  } catch {
    return fallbackPrompt(source, answer, mode);
  }
}

function fallbackPrompt(source: RetrievedChunk, answer: string, mode: "quiz" | "flashcard") {
  const subject = extractSubject(answer) ?? extractSection(source.excerpt) ?? source.noteTitle;
  if (mode === "quiz") return `What does your note say about ${subject}?`;
  return `Recall the key point about ${subject}.`;
}

function cleanExcerpt(excerpt: string) {
  return excerpt
    .replace(/^Note:\s*.*$/gim, "")
    .replace(/^Section:\s*.*$/gim, "")
    .replace(/^#+\s*/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractSubject(answer: string) {
  const cleaned = answer
    .replace(/^#+\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
  const match = cleaned.match(/^(.{2,80}?)\s+(?:is|are|was|were|refers to|means|describes|uses|maintains|includes|occurs|happens)\b/i);
  if (!match) return null;
  const subject = match[1].trim().replace(/[:,"']+$/g, "");
  if (!subject || /^it$/i.test(subject) || /^they$/i.test(subject) || /^this$/i.test(subject)) return null;
  return subject;
}

function extractSection(excerpt: string) {
  const match = excerpt.match(/^Section:\s*(.+)$/m);
  return match?.[1]?.trim() || null;
}

function trimPrompt(prompt: string) {
  return prompt.replace(/\s+/g, " ").trim();
}
