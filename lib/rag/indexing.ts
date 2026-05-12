import { dbAll, dbGet, dbRun, dbRunSync, dbTransaction } from "@/lib/db";
import { listDescendantFolderIds } from "@/lib/services/folders";
import { listNotes } from "@/lib/services/notes";
import { resolveAiContext } from "@/lib/services/ai-access";
import { chunkNote, chunkDocumentPages } from "@/lib/rag/chunking";
import { getDocumentPages } from "@/lib/services/documents";
import { embedBatch } from "@/lib/rag/embeddings";
import { consumeQuota, recordUsage } from "@/lib/services/quotas";
import { autoTagNote } from "@/lib/rag/auto-tag";
import { id, now, sha256 } from "@/lib/utils";
import type { Note } from "@/lib/types";

export async function reindexNotes(userId: string, scope?: { noteId?: string; folderId?: string | null }) {
  const ai = await resolveAiContext(userId, "index");
  await purgeOrphanedChunks(userId);
  const folderIds = scope?.folderId ? await listDescendantFolderIds(userId, scope.folderId) : [];
  const notes = (await listNotes(userId))
    .filter((note) => note.userId === userId && !note.workspaceId)
    .filter((note) => {
    if (scope?.noteId) return note.id === scope.noteId;
    if (scope?.folderId !== undefined) return scope.folderId === null ? note.folderId === null : Boolean(note.folderId && folderIds.includes(note.folderId));
    return true;
  });

  const currentProvider = ai.ollamaBaseUrl ? "ollama" : ai.apiKey ? "openai" : "local";

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
    dbGet<{ count: number }>("select count(*) as count from notes where user_id = ? and workspace_id is null", [userId]),
    dbGet<{ count: number }>("select count(*) as count from chunks where user_id = ?", [userId]),
    dbGet<{ count: number }>(
      "select count(*) as count from notes n where n.user_id = ? and n.workspace_id is null and not exists (select 1 from chunks c where c.note_id = n.id and c.content_hash = n.content_hash and c.user_id = ?)",
      [userId, userId]
    )
  ]);
  return { notes: notes?.count ?? 0, chunks: chunks?.count ?? 0, staleNotes: stale?.count ?? 0 };
}

// Snapshot existing embeddings into memory, wipe the note's rows, then re-insert cleanly.
// Avoids UNIQUE(note_id, chunk_index, content_hash) conflicts caused by in-place updates
// when chunks reorder, duplicate, or change provider.
async function indexNoteIncremental(
  userId: string,
  note: Note,
  ai: Awaited<ReturnType<typeof resolveAiContext>>
): Promise<number> {
  let newTexts: string[];
  let pageNumbers: (number | null)[];
  if (note.sourceDocumentId) {
    const pages = await getDocumentPages(note.sourceDocumentId);
    const docChunks = chunkDocumentPages(note.title, pages);
    newTexts = docChunks.map(c => c.text);
    pageNumbers = docChunks.map(c => c.page);
  } else {
    newTexts = chunkNote(note);
    pageNumbers = newTexts.map(() => null);
  }
  const newHashes = newTexts.map((text) => sha256(text));
  const currentProvider = ai.ollamaBaseUrl ? "ollama" : ai.apiKey ? "openai" : "local";

  // Cache current-provider embeddings by chunk hash before wiping the rows.
  const existing = await dbAll<{
    chunk_content_hash: string | null;
    vector_blob: Buffer | null;
    vector_id: string | null;
    vector_provider: string | null;
  }>(
    "select chunk_content_hash, vector_blob, vector_id, vector_provider from chunks where user_id = ? and note_id = ? and coalesce(vector_provider, 'local') = ?",
    [userId, note.id, currentProvider]
  );
  const embeddingCache = new Map<string, { vectorBlob: Buffer; vectorId: string }>();
  for (const row of existing) {
    if (row.chunk_content_hash && row.vector_blob && row.vector_id && !embeddingCache.has(row.chunk_content_hash)) {
      embeddingCache.set(row.chunk_content_hash, { vectorBlob: row.vector_blob, vectorId: row.vector_id });
    }
  }

  // Embed only chunks not covered by the cache (async — must happen outside the transaction).
  const needEmbed = newTexts.map((_, i) => i).filter((i) => !embeddingCache.has(newHashes[i]));
  if (needEmbed.length > 0) {
    if (ai.mode === "hosted") {
      await consumeQuota(userId, ai.settings.hostedPlan, "index");
    } else {
      await recordUsage(userId, "index");
    }
  }
  const newEmbeddings = needEmbed.length > 0
    ? await embedBatch(userId, needEmbed.map((i) => newTexts[i]), ai.settings.embeddingModel, ai)
    : [];

  // Delete all existing chunks then insert the new set atomically so the note
  // is never in a partially-indexed state if something fails mid-way.
  dbTransaction(() => {
    dbRunSync("delete from chunks where user_id = ? and note_id = ?", [userId, note.id]);

    let embedIdx = 0;
    for (let i = 0; i < newTexts.length; i++) {
      const chunkHash = newHashes[i];
      const cached = embeddingCache.get(chunkHash);
      let vectorBlob: Buffer | Uint8Array;
      let vectorId: string;
      let provider: string;

      if (cached) {
        vectorBlob = cached.vectorBlob;
        vectorId = cached.vectorId;
        provider = currentProvider;
      } else {
        const embedding = newEmbeddings[embedIdx++];
        vectorId = `${embedding.provider}:${sha256(`${note.id}:${i}:${note.contentHash}`).slice(0, 24)}`;
        vectorBlob = new Uint8Array(new Float32Array(embedding.vector).buffer);
        provider = embedding.provider;
      }

      dbRunSync(
        `insert into chunks
           (id, user_id, note_id, chunk_text, chunk_index, content_hash, chunk_content_hash,
            embedded, vector_id, vector_blob, vector_json, vector_provider, page_number, source_document_id, created_at, updated_at)
         values (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, null, ?, ?, ?, ?, ?)`,
        [id(), userId, note.id, newTexts[i], i, note.contentHash, chunkHash, vectorId, vectorBlob, provider, pageNumbers[i] ?? null, note.sourceDocumentId ?? null, now(), now()]
      );
    }
  });

  // Auto-tag untagged notes when an LLM is available. Fire-and-forget so
  // it never blocks or fails the indexing result if the model is slow/down.
  if (ai.mode !== "local") {
    autoTagNote(userId, note.id, note.title, note.markdownContent ?? "", ai).catch(console.error);
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
