import { NextResponse } from "next/server";
import { withAuthenticatedUser } from "@/lib/auth";
import { dbAll, dbGet, dbRun } from "@/lib/db";
import { id, now, sha256 } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(_: Request, { params }: { params: Promise<{ token: string }> }) {
  return withAuthenticatedUser(async (user) => {
    const { token } = await params;

    const sourceFolder = await dbGet<{ id: string; name: string; user_id: string }>(
      "select id, name, user_id from folders where public_token = ?",
      [token]
    );
    if (!sourceFolder) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const allFolders = await dbAll<{ id: string; name: string; parent_id: string | null }>(
      "select id, name, parent_id from folders where user_id = ?",
      [sourceFolder.user_id]
    );

    // BFS from root to collect all folder IDs in this subtree
    const childrenByParent = new Map<string, string[]>();
    for (const f of allFolders) {
      if (f.parent_id) {
        childrenByParent.set(f.parent_id, [...(childrenByParent.get(f.parent_id) ?? []), f.id]);
      }
    }
    const folderIds: string[] = [sourceFolder.id];
    for (let i = 0; i < folderIds.length; i++) {
      folderIds.push(...(childrenByParent.get(folderIds[i]) ?? []));
    }

    const allFolderMap = new Map(allFolders.map((f) => [f.id, f]));

    // Collect all notes in these folders
    const placeholders = folderIds.map(() => "?").join(",");
    const sourceNotes = await dbAll<{ id: string; title: string; markdown_content: string; folder_id: string | null }>(
      `select id, title, markdown_content, folder_id from notes where folder_id in (${placeholders})`,
      folderIds
    );

    const timestamp = now();

    // Map old folder IDs -> new folder IDs
    const folderIdMap = new Map<string, string>();
    for (const fid of folderIds) {
      folderIdMap.set(fid, id());
    }

    // Create folders in BFS order so parents always exist before children
    for (const fid of folderIds) {
      const src = allFolderMap.get(fid)!;
      const newId = folderIdMap.get(fid)!;
      // parent is null for the root folder; otherwise map to the new parent ID
      const newParentId = src.parent_id && src.id !== sourceFolder.id
        ? (folderIdMap.get(src.parent_id) ?? null)
        : null;
      await dbRun(
        "insert into folders (id, user_id, parent_id, workspace_id, name, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?)",
        [newId, user.id, newParentId, null, src.name, timestamp, timestamp]
      );
    }

    // Clone notes into the new folder tree
    for (const note of sourceNotes) {
      const newFolderId = note.folder_id ? (folderIdMap.get(note.folder_id) ?? null) : null;
      await dbRun(
        "insert into notes (id, user_id, folder_id, workspace_id, title, markdown_content, content_hash, doc_status, doc_type, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [id(), user.id, newFolderId, null, note.title, note.markdown_content, sha256(note.markdown_content), "active", "note", timestamp, timestamp]
      );
    }

    return NextResponse.json({
      folderId: folderIdMap.get(sourceFolder.id),
      noteCount: sourceNotes.length
    });
  });
}
