import fs from "fs";
import path from "path";
import { dbAll, dbGet, dbRun } from "@/lib/db";
import type { Note, NoteSharePermission } from "@/lib/types";
import { id, now, sha256, toCamelRecord } from "@/lib/utils";

function imagesDir() {
  const base = process.env.DATA_DIR?.trim() || path.join(process.env.APP_DIR?.trim() || process.cwd(), "data");
  return path.join(base, "images");
}


const starter = `# Untitled document

Add your content here. Index this document to make it queryable by the AI tools.
`;

export async function listNotes(userId: string, workspaceId?: string | null): Promise<Note[]> {
  if (workspaceId) {
    const rows = await dbAll(
      "select * from notes where workspace_id = ? order by coalesce(sort_order, 999999) asc, updated_at desc",
      [workspaceId]
    );
    return rows.map((row) => toCamelRecord(row) as Note);
  }

  const [ownedRows, sharedRows] = await Promise.all([
    dbAll(
      "select * from notes where user_id = ? and workspace_id is null order by coalesce(sort_order, 999999) asc, updated_at desc",
      [userId]
    ),
    dbAll(
      `select n.*, ns.permission as share_permission from notes n
       join note_shares ns on ns.note_id = n.id and ns.shared_with_user_id = ?
       where n.workspace_id is null order by n.updated_at desc`,
      [userId]
    )
  ]);

  return [
    ...ownedRows.map((row) => toCamelRecord(row) as Note),
    ...sharedRows.map((row) => ({
      ...(toCamelRecord(row) as Note),
      sharePermission: row.share_permission as NoteSharePermission
    }))
  ];
}

export async function getNote(userId: string, noteId: string, workspaceId?: string | null): Promise<Note | null> {
  if (workspaceId) {
    const row = await dbGet("select * from notes where id = ? and workspace_id = ?", [noteId, workspaceId]);
    return row ? (toCamelRecord(row) as Note) : null;
  }
  // Check ownership first
  const owned = await dbGet("select * from notes where id = ? and user_id = ? and workspace_id is null", [noteId, userId]);
  if (owned) return toCamelRecord(owned) as Note;
  // Fall back to share check
  const shareRow = await dbGet<{ permission: string }>(
    "select permission from note_shares where note_id = ? and shared_with_user_id = ?",
    [noteId, userId]
  );
  if (!shareRow) return null;
  const row = await dbGet("select * from notes where id = ?", [noteId]);
  return row ? { ...(toCamelRecord(row) as Note), sharePermission: shareRow.permission as NoteSharePermission } : null;
}

export async function createNote(
  userId: string,
  input: {
    title?: string;
    folderId?: string | null;
    markdownContent?: string;
    workspaceId?: string | null;
    department?: string | null;
    effectiveDate?: string | null;
    docStatus?: string | null;
    docType?: string | null;
  }
): Promise<Note> {
  const content = input.markdownContent ?? starter;
  const note: Note = {
    id: id(),
    userId,
    folderId: input.folderId ?? null,
    workspaceId: input.workspaceId ?? null,
    title: input.title?.trim() || "Untitled note",
    markdownContent: content,
    contentHash: sha256(content),
    department: input.department ?? null,
    effectiveDate: input.effectiveDate ?? null,
    docStatus: (input.docStatus as Note["docStatus"]) ?? "active",
    docType: (input.docType as Note["docType"]) ?? "note",
    createdAt: now(),
    updatedAt: now()
  };
  await dbRun(
    "insert into notes (id, user_id, folder_id, workspace_id, title, markdown_content, content_hash, department, effective_date, doc_status, doc_type, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [note.id, userId, note.folderId, note.workspaceId ?? null, note.title, note.markdownContent, note.contentHash, note.department ?? null, note.effectiveDate ?? null, note.docStatus ?? "active", note.docType ?? "note", note.createdAt, note.updatedAt]
  );
  return note;
}

export async function updateNote(
  userId: string,
  noteId: string,
  input: Partial<Pick<Note, "title" | "folderId" | "markdownContent" | "sortOrder" | "department" | "effectiveDate" | "docStatus" | "docType">>
): Promise<Note | null> {
  // Owner check first, then share-edit check
  let existing = await dbGet("select * from notes where id = ? and user_id = ?", [noteId, userId])
    .then((r) => r ? toCamelRecord(r) as Note : null);
  if (!existing) {
    const shareRow = await dbGet<{ permission: string }>(
      "select permission from note_shares where note_id = ? and shared_with_user_id = ?",
      [noteId, userId]
    );
    if (shareRow?.permission !== "edit") return null;
    const row = await dbGet("select * from notes where id = ?", [noteId]);
    existing = row ? toCamelRecord(row) as Note : null;
  }
  if (!existing) return null;
  const nextContent = input.markdownContent ?? existing.markdownContent;
  const nextHash = sha256(nextContent);

  const contentChanged = input.markdownContent !== undefined && nextHash !== existing.contentHash;

  if (contentChanged) {
    await dbRun(
      "insert into note_versions (id, note_id, user_id, title, markdown_content, created_at) values (?, ?, ?, ?, ?, ?)",
      [id(), noteId, userId, existing.title, existing.markdownContent, now()]
    );
    await dbRun(
      `delete from note_versions where note_id = ? and id not in (
         select id from note_versions where note_id = ? order by created_at desc limit 10
       )`,
      [noteId, noteId]
    );
  }

  const next: Note = {
    ...existing,
    title: input.title?.trim() || existing.title,
    folderId: input.folderId === undefined ? existing.folderId : input.folderId,
    markdownContent: nextContent,
    contentHash: nextHash,
    sortOrder: input.sortOrder !== undefined ? input.sortOrder : existing.sortOrder,
    department: input.department !== undefined ? input.department : existing.department,
    effectiveDate: input.effectiveDate !== undefined ? input.effectiveDate : existing.effectiveDate,
    docStatus: input.docStatus !== undefined ? input.docStatus : existing.docStatus,
    docType: input.docType !== undefined ? input.docType : existing.docType,
    updatedAt: now()
  };
  await dbRun(
    "update notes set folder_id = ?, title = ?, markdown_content = ?, content_hash = ?, sort_order = ?, department = ?, effective_date = ?, doc_status = ?, doc_type = ?, updated_at = ? where id = ? and user_id = ?",
    [next.folderId, next.title, next.markdownContent, next.contentHash, next.sortOrder ?? null, next.department ?? null, next.effectiveDate ?? null, next.docStatus ?? null, next.docType ?? null, next.updatedAt, noteId, userId]
  );

  return next;
}

export type NoteVersion = { id: string; noteId: string; title: string; createdAt: string };

export async function listNoteVersions(userId: string, noteId: string): Promise<NoteVersion[]> {
  const rows = await dbAll<{ id: string; note_id: string; title: string; created_at: string }>(
    "select id, note_id, title, created_at from note_versions where note_id = ? and user_id = ? order by created_at desc limit 10",
    [noteId, userId]
  );
  return rows.map((r) => ({ id: r.id, noteId: r.note_id, title: r.title, createdAt: r.created_at }));
}

export async function restoreNoteVersion(userId: string, noteId: string, versionId: string): Promise<Note | null> {
  const row = await dbAll<{ id: string; title: string; markdown_content: string }>(
    "select id, title, markdown_content from note_versions where id = ? and note_id = ? and user_id = ?",
    [versionId, noteId, userId]
  );
  if (!row[0]) return null;
  return updateNote(userId, noteId, { title: row[0].title, markdownContent: row[0].markdown_content });
}

export async function deleteNote(userId: string, noteId: string) {
  const note = await getNote(userId, noteId);
  if (note) {
    const imageIds = [...note.markdownContent.matchAll(/\/api\/images\/([a-zA-Z0-9_-]+)/g)].map((m) => m[1]);
    if (imageIds.length > 0) {
      const rows = await dbAll<{ id: string; filename: string }>(
        `select id, filename from images where user_id = ? and id in (${imageIds.map(() => "?").join(",")})`,
        [userId, ...imageIds]
      );
      const dir = imagesDir();
      for (const row of rows) {
        const filePath = path.join(dir, row.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        await dbRun("delete from images where id = ? and user_id = ?", [row.id, userId]);
      }
    }
  }
  await dbRun("delete from chunks where user_id = ? and note_id = ?", [userId, noteId]);
  await dbRun("delete from notes where id = ? and user_id = ?", [noteId, userId]);
}

export async function exactSearch(userId: string, query: string) {
  const term = query.trim();
  if (!term) return [];

  const rows = await dbAll<{ id: string; title: string; markdown_content: string }>(
    "select id, title, markdown_content from notes where user_id = ? and (title like ? or markdown_content like ?) order by updated_at desc limit 30",
    [userId, `%${term}%`, `%${term}%`]
  );

  return rows.map((row) => {
    const lower = row.markdown_content.toLowerCase();
    const index = lower.indexOf(term.toLowerCase());
    const start = index >= 0 ? Math.max(0, index - 100) : 0;
    const end = index >= 0 ? Math.min(row.markdown_content.length, index + term.length + 180) : Math.min(row.markdown_content.length, 280);
    return {
      noteId: row.id,
      noteTitle: row.title,
      excerpt: row.markdown_content.slice(start, end).replace(/\s+/g, " ").trim()
    };
  });
}
