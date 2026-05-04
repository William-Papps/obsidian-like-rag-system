import { dbAll, dbGet, dbRun } from "@/lib/db";
import type { NoteShare, NoteSharePermission } from "@/lib/types";
import { id, now } from "@/lib/utils";

function toShare(row: Record<string, unknown>): NoteShare {
  return {
    id: row.id as string,
    noteId: row.note_id as string,
    ownerUserId: row.owner_user_id as string,
    sharedWithUserId: row.shared_with_user_id as string,
    sharedWithEmail: row.email as string,
    sharedWithName: row.name as string,
    permission: row.permission as NoteSharePermission,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function shareNote(
  ownerUserId: string,
  noteId: string,
  email: string,
  permission: NoteSharePermission
): Promise<NoteShare> {
  // Verify the note belongs to the owner
  const note = await dbGet("select id from notes where id = ? and user_id = ?", [noteId, ownerUserId]);
  if (!note) throw new Error("Note not found or you don't own it.");

  // Look up the target user by email
  const target = await dbGet<{ id: string; email: string; name: string }>(
    "select id, email, name from users where email = ?",
    [email.trim().toLowerCase()]
  );
  if (!target) throw new Error("No user found with that email address.");
  if (target.id === ownerUserId) throw new Error("You can't share a note with yourself.");

  // Upsert the share
  const existing = await dbGet("select id from note_shares where note_id = ? and shared_with_user_id = ?", [noteId, target.id]);
  if (existing) {
    await dbRun("update note_shares set permission = ?, updated_at = ? where note_id = ? and shared_with_user_id = ?", [
      permission, now(), noteId, target.id
    ]);
  } else {
    await dbRun(
      "insert into note_shares (id, note_id, owner_user_id, shared_with_user_id, permission, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?)",
      [id(), noteId, ownerUserId, target.id, permission, now(), now()]
    );
  }

  const row = await dbGet(
    `select ns.*, u.email, u.name from note_shares ns join users u on u.id = ns.shared_with_user_id
     where ns.note_id = ? and ns.shared_with_user_id = ?`,
    [noteId, target.id]
  );
  return toShare(row!);
}

export async function listNoteShares(ownerUserId: string, noteId: string): Promise<NoteShare[]> {
  const note = await dbGet("select id from notes where id = ? and user_id = ?", [noteId, ownerUserId]);
  if (!note) throw new Error("Note not found or you don't own it.");

  const rows = await dbAll(
    `select ns.*, u.email, u.name from note_shares ns join users u on u.id = ns.shared_with_user_id
     where ns.note_id = ? order by ns.created_at asc`,
    [noteId]
  );
  return rows.map(toShare);
}

export async function updateNoteShare(
  ownerUserId: string,
  noteId: string,
  sharedWithUserId: string,
  permission: NoteSharePermission
): Promise<void> {
  const note = await dbGet("select id from notes where id = ? and user_id = ?", [noteId, ownerUserId]);
  if (!note) throw new Error("Note not found or you don't own it.");
  await dbRun("update note_shares set permission = ?, updated_at = ? where note_id = ? and shared_with_user_id = ?", [
    permission, now(), noteId, sharedWithUserId
  ]);
}

export async function revokeNoteShare(ownerUserId: string, noteId: string, sharedWithUserId: string): Promise<void> {
  const note = await dbGet("select id from notes where id = ? and user_id = ?", [noteId, ownerUserId]);
  if (!note) throw new Error("Note not found or you don't own it.");
  await dbRun("delete from note_shares where note_id = ? and shared_with_user_id = ?", [noteId, sharedWithUserId]);
}

export async function getNoteShareForUser(
  userId: string,
  noteId: string
): Promise<{ permission: NoteSharePermission } | null> {
  const row = await dbGet<{ permission: string }>(
    "select permission from note_shares where note_id = ? and shared_with_user_id = ?",
    [noteId, userId]
  );
  if (!row) return null;
  return { permission: row.permission as NoteSharePermission };
}
