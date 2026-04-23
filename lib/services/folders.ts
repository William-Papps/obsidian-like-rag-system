import { dbAll, dbGet, dbRun } from "@/lib/db";
import type { Folder } from "@/lib/types";
import { id, now, toCamelRecord } from "@/lib/utils";

export async function listFolders(userId: string): Promise<Folder[]> {
  const rows = await dbAll("select * from folders where user_id = ? order by name collate nocase", [userId]);
  return rows.map((row) => toCamelRecord(row) as Folder);
}

export async function createFolder(userId: string, name: string, parentId: string | null = null): Promise<Folder> {
  const folder: Folder = {
    id: id(),
    userId,
    parentId,
    name: name.trim() || "Untitled folder",
    createdAt: now(),
    updatedAt: now()
  };
  await dbRun("insert into folders (id, user_id, parent_id, name, created_at, updated_at) values (?, ?, ?, ?, ?, ?)", [
    folder.id,
    userId,
    parentId,
    folder.name,
    folder.createdAt,
    folder.updatedAt
  ]);
  return folder;
}

export async function renameFolder(userId: string, folderId: string, name: string) {
  await dbRun("update folders set name = ?, updated_at = ? where id = ? and user_id = ?", [
    name.trim() || "Untitled folder",
    now(),
    folderId,
    userId
  ]);
}

export async function updateFolder(
  userId: string,
  folderId: string,
  input: { name?: string; parentId?: string | null }
) {
  const existing = await dbGet<{ id: string }>("select id from folders where id = ? and user_id = ?", [folderId, userId]);
  if (!existing) return;

  if (input.parentId !== undefined) {
    if (input.parentId === folderId) throw new Error("A folder cannot be moved into itself.");
    if (input.parentId) {
      const parent = await dbGet<{ id: string }>("select id from folders where id = ? and user_id = ?", [input.parentId, userId]);
      if (!parent) throw new Error("Target folder was not found.");
      if (await isDescendant(userId, input.parentId, folderId)) throw new Error("A folder cannot be moved into one of its descendants.");
    }
    await dbRun("update folders set parent_id = ?, updated_at = ? where id = ? and user_id = ?", [input.parentId, now(), folderId, userId]);
  }

  if (input.name !== undefined) {
    await renameFolder(userId, folderId, input.name);
  }
}

export async function deleteFolder(userId: string, folderId: string) {
  await dbRun("delete from folders where id = ? and user_id = ?", [folderId, userId]);
}

export async function listDescendantFolderIds(userId: string, folderId: string): Promise<string[]> {
  const rows = await dbAll<{ id: string; parent_id: string | null }>("select id, parent_id from folders where user_id = ?", [userId]);
  const childrenByParent = new Map<string, string[]>();
  for (const row of rows) {
    if (!row.parent_id) continue;
    childrenByParent.set(row.parent_id, [...(childrenByParent.get(row.parent_id) ?? []), row.id]);
  }

  const ids = [folderId];
  for (let index = 0; index < ids.length; index += 1) {
    ids.push(...(childrenByParent.get(ids[index]) ?? []));
  }
  return ids;
}

async function isDescendant(userId: string, folderId: string, possibleAncestorId: string): Promise<boolean> {
  let current = await dbGet<{ parent_id: string | null }>("select parent_id from folders where id = ? and user_id = ?", [folderId, userId]);
  while (current?.parent_id) {
    if (current.parent_id === possibleAncestorId) return true;
    current = await dbGet<{ parent_id: string | null }>("select parent_id from folders where id = ? and user_id = ?", [
      current.parent_id,
      userId
    ]);
  }
  return false;
}
