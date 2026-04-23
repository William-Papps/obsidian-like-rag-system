import { dbAll, dbGet, dbRun } from "@/lib/db";
import type { Note } from "@/lib/types";
import { id, now, sha256, toCamelRecord } from "@/lib/utils";

const starter = `# New study note

Capture the source facts you want to revise here. The assistant will only answer from notes you have written and indexed.
`;

export async function listNotes(userId: string): Promise<Note[]> {
  const rows = await dbAll("select * from notes where user_id = ? order by updated_at desc", [userId]);
  return rows.map((row) => toCamelRecord(row) as Note);
}

export async function getNote(userId: string, noteId: string): Promise<Note | null> {
  const row = await dbGet("select * from notes where id = ? and user_id = ?", [noteId, userId]);
  return row ? (toCamelRecord(row) as Note) : null;
}

export async function createNote(
  userId: string,
  input: { title?: string; folderId?: string | null; markdownContent?: string }
): Promise<Note> {
  const content = input.markdownContent ?? starter;
  const note: Note = {
    id: id(),
    userId,
    folderId: input.folderId ?? null,
    title: input.title?.trim() || "Untitled note",
    markdownContent: content,
    contentHash: sha256(content),
    createdAt: now(),
    updatedAt: now()
  };
  await dbRun(
    "insert into notes (id, user_id, folder_id, title, markdown_content, content_hash, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?)",
    [note.id, userId, note.folderId, note.title, note.markdownContent, note.contentHash, note.createdAt, note.updatedAt]
  );
  return note;
}

export async function updateNote(
  userId: string,
  noteId: string,
  input: Partial<Pick<Note, "title" | "folderId" | "markdownContent">>
): Promise<Note | null> {
  const existing = await getNote(userId, noteId);
  if (!existing) return null;
  const nextContent = input.markdownContent ?? existing.markdownContent;
  const next: Note = {
    ...existing,
    title: input.title?.trim() || existing.title,
    folderId: input.folderId === undefined ? existing.folderId : input.folderId,
    markdownContent: nextContent,
    contentHash: sha256(nextContent),
    updatedAt: now()
  };
  await dbRun(
    "update notes set folder_id = ?, title = ?, markdown_content = ?, content_hash = ?, updated_at = ? where id = ? and user_id = ?",
    [next.folderId, next.title, next.markdownContent, next.contentHash, next.updatedAt, noteId, userId]
  );
  return next;
}

export async function deleteNote(userId: string, noteId: string) {
  await dbRun("delete from notes where id = ? and user_id = ?", [noteId, userId]);
}

export async function exactSearch(userId: string, query: string) {
  const term = query.trim();
  if (!term) return [];
  const rows = await dbAll<{ id: string; title: string; markdown_content: string }>(
    "select id, title, markdown_content from notes where user_id = ? and markdown_content like ? order by updated_at desc limit 30",
    [userId, `%${term}%`]
  );
  return rows.map((row) => {
    const lower = row.markdown_content.toLowerCase();
    const index = lower.indexOf(term.toLowerCase());
    const start = Math.max(0, index - 100);
    const end = Math.min(row.markdown_content.length, index + term.length + 180);
    return {
      noteId: row.id,
      noteTitle: row.title,
      excerpt: row.markdown_content.slice(start, end).replace(/\s+/g, " ").trim()
    };
  });
}
