import { dbAll, dbGet } from "@/lib/db";
import { listDescendantFolderIds } from "@/lib/services/folders";
import { getNote } from "@/lib/services/notes";
import { getProviderSettings } from "@/lib/services/settings";
import { cosine, embedText } from "@/lib/rag/embeddings";
import type { RetrievedChunk } from "@/lib/types";
import { truncate } from "@/lib/utils";
import type { SqlValue } from "sql.js";

export async function retrieveChunks(
  userId: string,
  query: string,
  scope: { noteId?: string; folderId?: string | null; limit?: number } = {}
): Promise<RetrievedChunk[]> {
  const settings = await getProviderSettings(userId);
  const queryVector = (await embedText(userId, query, settings.embeddingModel)).vector;
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
      where += ` and n.folder_id in (${folderIds.map(() => "?").join(", ")})`;
      params.push(...folderIds);
    }
  }

  const rows = await dbAll<{ id: string; note_id: string; title: string; chunk_text: string; vector_json: string }>(
    `select c.id, c.note_id, c.chunk_text, c.vector_json, n.title
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
      excerpt: truncate(row.chunk_text, 900),
      similarity: cosine(queryVector, JSON.parse(row.vector_json) as number[])
    }))
    .filter((row) => row.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, scope.limit ?? 6);
}

export async function resolveScopeTitle(userId: string, scope: { noteId?: string; folderId?: string | null }) {
  if (scope.noteId) return (await getNote(userId, scope.noteId))?.title ?? "Current note";
  if (scope.folderId) {
    const row = await dbGet<{ name: string }>("select name from folders where id = ? and user_id = ?", [scope.folderId, userId]);
    return row?.name ?? "Selected folder";
  }
  return "All notes";
}
