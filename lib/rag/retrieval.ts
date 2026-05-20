import { dbAll, dbGet } from "@/lib/db";
import { listDescendantFolderIds } from "@/lib/services/folders";
import { getNote } from "@/lib/services/notes";
import { getProviderSettings } from "@/lib/services/settings";
import { cosine, embedText, embedBatch } from "@/lib/rag/embeddings";
import { rewriteQueryRuleBased, extractKeywords, dedupeStrings } from "@/lib/rag/query-rewrite";
import { getChunkBoostsForUser } from "@/lib/services/chunk-feedback";
import type { AiContext, RetrievedChunk } from "@/lib/types";
import { truncate } from "@/lib/utils";

export type RetrievalMeta = {
  topScore: number;
  averageScore: number;
  scoreGap: number;
  resultCount: number;
  lowConfidence: boolean;
};

type ScopeFilter = { noteId?: string; folderId?: string | null; limit?: number };

type ChunkRow = {
  id: string;
  note_id: string;
  source_document_id: string | null;
  title: string;
  chunk_text: string;
  vector_json: string | null;
  vector_blob: Uint8Array | null;
  page_number: number | null;
};

// ── Backwards-compatible single-query retrieval (unchanged callers) ──────────

export async function retrieveChunks(
  userId: string,
  query: string,
  scope: ScopeFilter = {},
  context?: AiContext
): Promise<RetrievedChunk[]> {
  const settings = await getProviderSettings(userId);
  const embeddingModel = context?.settings?.embeddingModel ?? settings.embeddingModel;
  const queryVector = (await embedText(userId, query, embeddingModel, context)).vector;
  const rows = await loadScopeChunkRows(userId, scope);

  return rows
    .map((row) => ({
      chunkId: row.id,
      noteId: row.note_id,
      noteTitle: row.title,
      excerpt: truncate(row.chunk_text, 900),
      similarity: cosine(queryVector, decodeVector(row)),
      pageNumber: row.page_number ?? null,
      documentId: row.source_document_id ?? null
    }))
    .filter((r) => r.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, scope.limit ?? 6);
}

// ── Multi-pass retrieval: multiple query variants merged by best score ────────
//
// Generates 3 variants (original, rule-rewritten, keyword-only), embeds them
// in a single batch call, then picks the best cosine score per chunk across all
// variants. Applies small feedback boosts (±0.05) so cosine remains dominant.

export async function retrieveMultiPass(
  userId: string,
  query: string,
  scope: ScopeFilter = {},
  context?: AiContext
): Promise<{ chunks: RetrievedChunk[]; meta: RetrievalMeta }> {
  const settings = await getProviderSettings(userId);
  const embeddingModel = context?.settings?.embeddingModel ?? settings.embeddingModel;

  const rewritten = rewriteQueryRuleBased(query);
  const keywords = extractKeywords(query);
  // Deduplicate before embedding to avoid wasting embedding calls on identical variants.
  const variants = dedupeStrings([query, rewritten, keywords]);

  const [embedResults, rows, boosts] = await Promise.all([
    embedBatch(userId, variants, embeddingModel, context),
    loadScopeChunkRows(userId, scope),
    getChunkBoostsForUser(userId).catch(() => new Map<string, number>())
  ]);

  const queryVectors = embedResults.map((r) => r.vector);

  const chunks = rows
    .map((row) => {
      const vec = decodeVector(row);
      const baseScore = Math.max(...queryVectors.map((qv) => cosine(qv, vec)));
      const boost = boosts.get(row.id) ?? 0;
      const similarity = Math.min(1, Math.max(0, baseScore + boost));
      return {
        chunkId: row.id,
        noteId: row.note_id,
        noteTitle: row.title,
        excerpt: truncate(row.chunk_text, 900),
        similarity,
        pageNumber: row.page_number ?? null,
        documentId: row.source_document_id ?? null
      };
    })
    .filter((r) => r.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, scope.limit ?? 6);

  return { chunks, meta: computeRetrievalMeta(chunks) };
}

export function computeRetrievalMeta(chunks: RetrievedChunk[]): RetrievalMeta {
  if (!chunks.length) {
    return { topScore: 0, averageScore: 0, scoreGap: 0, resultCount: 0, lowConfidence: true };
  }
  const topScore = chunks[0].similarity;
  const scoreGap = topScore - (chunks[1]?.similarity ?? 0);
  const averageScore = chunks.reduce((s, c) => s + c.similarity, 0) / chunks.length;
  const lowConfidence = topScore < 0.08 || (topScore < 0.2 && scoreGap < 0.05);
  return { topScore, averageScore, scoreGap, resultCount: chunks.length, lowConfidence };
}

export async function resolveScopeTitle(userId: string, scope: { noteId?: string; folderId?: string | null }) {
  if (scope.noteId) return (await getNote(userId, scope.noteId))?.title ?? "Current note";
  if (scope.folderId) {
    const row = await dbGet<{ name: string }>("select name from folders where id = ? and user_id = ?", [scope.folderId, userId]);
    return row?.name ?? "Selected folder";
  }
  return "All notes";
}

// ── Private helpers ───────────────────────────────────────────────────────────

async function loadScopeChunkRows(userId: string, scope: ScopeFilter): Promise<ChunkRow[]> {
  const params: (string | null)[] = [];
  let where: string;

  where = "c.user_id = ? and n.workspace_id is null";
  params.push(userId);

  if (scope.noteId) {
    where += " and c.note_id = ?";
    params.push(scope.noteId);
  }
  if (scope.folderId !== undefined) {
    if (scope.folderId === null) {
      where += " and n.folder_id is null";
    } else {
      const folderIds = await listDescendantFolderIds(userId, scope.folderId);
      where += ` and n.folder_id in (${folderIds.map(() => "?").join(", ")})`;
      params.push(...folderIds);
    }
  }

  return dbAll<ChunkRow>(
    `select c.id, c.note_id, c.source_document_id, c.chunk_text, c.vector_json, c.vector_blob, c.page_number, n.title
     from chunks c
     join notes n on n.id = c.note_id
     where ${where}`,
    params
  );
}

function decodeVector(row: ChunkRow): number[] {
  if (row.vector_blob && row.vector_blob.byteLength > 0) {
    return Array.from(new Float32Array(row.vector_blob.buffer, row.vector_blob.byteOffset, row.vector_blob.byteLength / 4));
  }
  if (row.vector_json) {
    return JSON.parse(row.vector_json) as number[];
  }
  console.warn(`[retrieval] chunk ${(row as { id?: string }).id ?? "unknown"} has no vector — skipping`);
  return [];
}
