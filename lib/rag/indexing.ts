import { dbAll, dbGet, dbRun } from "@/lib/db";
import { listDescendantFolderIds } from "@/lib/services/folders";
import { listNotes } from "@/lib/services/notes";
import { resolveAiContext } from "@/lib/services/ai-access";
import { chunkNote } from "@/lib/rag/chunking";
import { embedBatch } from "@/lib/rag/embeddings";
import { id, now, sha256 } from "@/lib/utils";
import type { Note } from "@/lib/types";

export async function reindexNotes(userId: string, scope?: { noteId?: string; folderId?: string | null }) {
  const ai = await resolveAiContext(userId, "index");
  await purgeOrphanedChunks(userId);
  const folderIds = scope?.folderId ? await listDescendantFolderIds(userId, scope.folderId) : [];
  const notes = (await listNotes(userId)).filter((note) => {
    if (scope?.noteId) return note.id === scope.noteId;
    if (scope?.folderId !== undefined) return scope.folderId === null ? note.folderId === null : Boolean(note.folderId && folderIds.includes(note.folderId));
    return true;
  });

  const currentProvider = ai.apiKey ? "openai" : "local";

  let indexed = 0;
  for (const note of notes) {
    // Skip only if content hash matches AND chunks were embedded with the current provider.
    const upToDate = await dbGet<{ count: number }>(
      "select count(*) as count from chunks where user_id = ? and note_id = ? and content_hash = ? and coalesce(vector_provider, 'local') = ?",
      [userId, note.id, note.contentHash, currentProvider]
    );
    if ((upToDate?.count ?? 0) > 0) continue;

    indexed += await indexNoteIncremental(userId, note, ai);
  }

  const total = await dbGet<{ count: number }>("select count(*) as count from chunks where user_id = ?", [userId]);
  return { indexed, totalChunks: total?.count ?? 0 };
}

export async function getIndexStatus(userId: string) {
  const [notes, chunks, stale] = await Promise.all([
    dbGet<{ count: number }>("select count(*) as count from notes where user_id = ?", [userId]),
    dbGet<{ count: number }>("select count(*) as count from chunks where user_id = ?", [userId]),
    dbGet<{ count: number }>(
      "select count(*) as count from notes n where n.user_id = ? and not exists (select 1 from chunks c where c.note_id = n.id and c.content_hash = n.content_hash)",
      [userId]
    )
  ]);
  return { notes: notes?.count ?? 0, chunks: chunks?.count ?? 0, staleNotes: stale?.count ?? 0 };
}

// Per-chunk incremental: reuse embeddings for chunks whose content is unchanged.
// Only new/changed chunks incur an embedding call.
async function indexNoteIncremental(
  userId: string,
  note: Note,
  ai: Awaited<ReturnType<typeof resolveAiContext>>
): Promise<number> {
  const newTexts = chunkNote(note);
  const newHashes = newTexts.map((text) => sha256(text));

  const currentProvider = ai.apiKey ? "openai" : "local";

  // Load existing chunks for this note (with per-chunk hashes and provider where available).
  const existing = await dbAll<{
    id: string;
    chunk_content_hash: string | null;
    chunk_index: number;
    vector_provider: string | null;
  }>("select id, chunk_content_hash, chunk_index, vector_provider from chunks where user_id = ? and note_id = ? order by chunk_index", [userId, note.id]);

  // Two lookups: same-provider (fully reusable) and any-provider (needs re-embedding but row exists).
  const existingByHash = new Map<string, (typeof existing)[0]>();      // provider matches — reuse as-is
  const existingByHashAny = new Map<string, (typeof existing)[0]>();   // any provider — update in-place
  for (const row of existing) {
    if (!row.chunk_content_hash) continue;
    if (!existingByHashAny.has(row.chunk_content_hash)) existingByHashAny.set(row.chunk_content_hash, row);
    const providerMatch = (row.vector_provider ?? "local") === currentProvider;
    if (providerMatch && !existingByHash.has(row.chunk_content_hash)) existingByHash.set(row.chunk_content_hash, row);
  }

  // Need embedding: chunks whose hash has no matching same-provider row.
  const needEmbed: number[] = [];
  for (let i = 0; i < newTexts.length; i++) {
    if (!existingByHash.has(newHashes[i])) needEmbed.push(i);
  }

  // Embed only changed/new/provider-mismatched chunks.
  const embeddings = needEmbed.length > 0
    ? await embedBatch(userId, needEmbed.map((i) => newTexts[i]), ai.settings.embeddingModel, ai)
    : [];

  let embedIdx = 0;
  const usedExistingIds = new Set<string>();

  for (let i = 0; i < newTexts.length; i++) {
    const chunkHash = newHashes[i];
    const text = newTexts[i];
    const reused = existingByHash.get(chunkHash);

    if (reused) {
      usedExistingIds.add(reused.id);
      await dbRun(
        "update chunks set chunk_index = ?, content_hash = ?, updated_at = ? where id = ?",
        [i, note.contentHash, now(), reused.id]
      );
    } else {
      const embedding = embeddings[embedIdx++];
      const vectorId = `${embedding.provider}:${sha256(`${note.id}:${i}:${note.contentHash}`).slice(0, 24)}`;
      const vectorBlob = new Uint8Array(new Float32Array(embedding.vector).buffer);

      // If a row already exists at this position (different provider), update it in-place
      // to avoid violating the UNIQUE(note_id, chunk_index, content_hash) constraint.
      const stale = existingByHashAny.get(chunkHash);
      if (stale) {
        usedExistingIds.add(stale.id);
        await dbRun(
          "update chunks set chunk_index = ?, content_hash = ?, vector_id = ?, vector_blob = ?, vector_json = null, vector_provider = ?, embedded = 1, updated_at = ? where id = ?",
          [i, note.contentHash, vectorId, vectorBlob, embedding.provider, now(), stale.id]
        );
      } else {
        const chunkId = id();
        await dbRun(
          `insert into chunks
             (id, user_id, note_id, chunk_text, chunk_index, content_hash, chunk_content_hash,
              embedded, vector_id, vector_blob, vector_json, vector_provider, created_at, updated_at)
           values (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, null, ?, ?, ?)`,
          [chunkId, userId, note.id, text, i, note.contentHash, chunkHash, vectorId, vectorBlob, embedding.provider, now(), now()]
        );
      }
    }
  }

  // Delete chunks that are no longer part of the note.
  for (const row of existing) {
    if (!usedExistingIds.has(row.id)) {
      await dbRun("delete from chunks where id = ?", [row.id]);
    }
  }

  return needEmbed.length;
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
