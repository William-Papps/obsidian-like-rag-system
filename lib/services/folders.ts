import { dbAll, dbRun } from "@/lib/db";
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

export async function deleteFolder(userId: string, folderId: string) {
  await dbRun("delete from folders where id = ? and user_id = ?", [folderId, userId]);
}
