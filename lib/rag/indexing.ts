import { dbGet, dbRun } from "@/lib/db";
import { listDescendantFolderIds } from "@/lib/services/folders";
import { listNotes } from "@/lib/services/notes";
import { resolveAiContext } from "@/lib/services/ai-access";
import { chunkNote } from "@/lib/rag/chunking";
import { embedBatch } from "@/lib/rag/embeddings";
import { id, now, sha256 } from "@/lib/utils";

export async function reindexNotes(userId: string, scope?: { noteId?: string; folderId?: string | null }) {
  const ai = await resolveAiContext(userId, "index");
  await purgeOrphanedChunks(userId);
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

    // Batch all chunks for this note into one embedding API call instead of N sequential calls.
    const embeddings = await embedBatch(userId, chunks, ai.settings.embeddingModel, ai);

    for (let index = 0; index < chunks.length; index++) {
      const text = chunks[index];
      const embedding = embeddings[index];
      const chunkId = id();
      const vectorId = `${embedding.provider}:${sha256(`${note.id}:${index}:${note.contentHash}`).slice(0, 24)}`;
      // Store as compact Float32Array BLOB. vector_json left null for new chunks.
      const vectorBlob = new Uint8Array(new Float32Array(embedding.vector).buffer);
      await dbRun(
        "insert into chunks (id, user_id, note_id, chunk_text, chunk_index, content_hash, embedded, vector_id, vector_blob, vector_json, created_at, updated_at) values (?, ?, ?, ?, ?, ?, 1, ?, ?, null, ?, ?)",
        [chunkId, userId, note.id, text, index, note.contentHash, vectorId, vectorBlob, now(), now()]
      );
      indexed++;
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

async function purgeOrphanedChunks(userId: string) {
  await dbRun(
    `delete from chunks
     where user_id = ?
       and not exists (
         select 1 from notes
         where notes.id = chunks.note_id
           and notes.user_id = chunks.user_id
       )`,
    [userId]
  );
}
