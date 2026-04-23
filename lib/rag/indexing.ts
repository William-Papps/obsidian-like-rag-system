import { dbGet, dbRun } from "@/lib/db";
import { listDescendantFolderIds } from "@/lib/services/folders";
import { listNotes } from "@/lib/services/notes";
import { getProviderSettings } from "@/lib/services/settings";
import { chunkNote } from "@/lib/rag/chunking";
import { embedText } from "@/lib/rag/embeddings";
import { id, now, sha256 } from "@/lib/utils";

export async function reindexNotes(userId: string, scope?: { noteId?: string; folderId?: string | null }) {
  const settings = await getProviderSettings(userId);
  const folderIds = scope?.folderId ? await listDescendantFolderIds(userId, scope.folderId) : [];
  const notes = (await listNotes(userId)).filter((note) => {
    if (scope?.noteId) return note.id === scope.noteId;
    if (scope?.folderId !== undefined) return scope.folderId === null ? note.folderId === null : Boolean(note.folderId && folderIds.includes(note.folderId));
    return true;
  });

  let indexed = 0;
  for (const note of notes) {
    const existing = await dbGet<{ count: number }>(
      "select count(*) as count from chunks where user_id = ? and note_id = ? and content_hash = ?",
      [userId, note.id, note.contentHash]
    );
    if ((existing?.count ?? 0) > 0) continue;

    await dbRun("delete from chunks where user_id = ? and note_id = ?", [userId, note.id]);
    const chunks = chunkNote(note);
    for (let index = 0; index < chunks.length; index += 1) {
      const text = chunks[index];
      const embedding = await embedText(userId, text, settings.embeddingModel);
      const chunkId = id();
      await dbRun(
        "insert into chunks (id, user_id, note_id, chunk_text, chunk_index, content_hash, embedded, vector_id, vector_json, created_at, updated_at) values (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)",
        [
          chunkId,
          userId,
          note.id,
          text,
          index,
          note.contentHash,
          `${embedding.provider}:${sha256(`${note.id}:${index}:${note.contentHash}`).slice(0, 24)}`,
          JSON.stringify(embedding.vector),
          now(),
          now()
        ]
      );
      indexed += 1;
    }
  }

  const total = await dbGet<{ count: number }>("select count(*) as count from chunks where user_id = ?", [userId]);
  return { indexed, totalChunks: total?.count ?? 0 };
}

export async function getIndexStatus(userId: string) {
  const notes = await dbGet<{ count: number }>("select count(*) as count from notes where user_id = ?", [userId]);
  const chunks = await dbGet<{ count: number }>("select count(*) as count from chunks where user_id = ?", [userId]);
  const stale = await dbGet<{ count: number }>(
    "select count(*) as count from notes n where n.user_id = ? and not exists (select 1 from chunks c where c.note_id = n.id and c.content_hash = n.content_hash)",
    [userId]
  );
  return { notes: notes?.count ?? 0, chunks: chunks?.count ?? 0, staleNotes: stale?.count ?? 0 };
}
