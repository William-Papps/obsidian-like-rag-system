import { dbAll, dbGet, dbRun } from "@/lib/db";
import { id, now, toCamelRecord } from "@/lib/utils";

export type Tag = { id: string; userId: string; name: string; color: string; createdAt: string; updatedAt: string };

const TAG_COLORS = ["#8B5CF6", "#EC4899", "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#06B6D4", "#84CC16"];

export async function listTags(userId: string): Promise<Tag[]> {
  const rows = await dbAll("select * from tags where user_id = ? order by name asc", [userId]);
  return rows.map((row) => toCamelRecord(row) as Tag);
}

export async function getNoteTags(noteId: string): Promise<Tag[]> {
  const rows = await dbAll(
    `select t.* from tags t join note_tags nt on nt.tag_id = t.id where nt.note_id = ? order by t.name asc`,
    [noteId]
  );
  return rows.map((row) => toCamelRecord(row) as Tag);
}

export async function createTag(userId: string, name: string, color?: string): Promise<Tag> {
  const existing = await dbGet<{ id: string }>("select id from tags where user_id = ? and lower(name) = lower(?)", [userId, name]);
  if (existing) throw new Error("A tag with that name already exists.");
  const tagColor = color || TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];
  const tag: Tag = { id: id(), userId, name: name.trim(), color: tagColor, createdAt: now(), updatedAt: now() };
  await dbRun("insert into tags (id, user_id, name, color, created_at, updated_at) values (?, ?, ?, ?, ?, ?)", [
    tag.id, tag.userId, tag.name, tag.color, tag.createdAt, tag.updatedAt
  ]);
  return tag;
}

export async function deleteTag(userId: string, tagId: string) {
  await dbRun("delete from tags where id = ? and user_id = ?", [tagId, userId]);
}

export async function setNoteTags(noteId: string, tagIds: string[]) {
  await dbRun("delete from note_tags where note_id = ?", [noteId]);
  for (const tagId of tagIds) {
    await dbRun("insert or ignore into note_tags (note_id, tag_id, created_at) values (?, ?, ?)", [noteId, tagId, now()]);
  }
}

export async function addNoteTag(noteId: string, tagId: string) {
  await dbRun("insert or ignore into note_tags (note_id, tag_id, created_at) values (?, ?, ?)", [noteId, tagId, now()]);
}

export async function removeNoteTag(noteId: string, tagId: string) {
  await dbRun("delete from note_tags where note_id = ? and tag_id = ?", [noteId, tagId]);
}

export async function listNotesByTag(userId: string, tagId: string) {
  const rows = await dbAll(
    `select n.* from notes n join note_tags nt on nt.note_id = n.id where n.user_id = ? and nt.tag_id = ? order by n.updated_at desc`,
    [userId, tagId]
  );
  return rows;
}
