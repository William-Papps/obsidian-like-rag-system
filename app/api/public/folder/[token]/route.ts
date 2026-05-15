import { NextResponse } from "next/server";
import { dbAll, dbGet } from "@/lib/db";
import { enforceRateLimit, clientIp, RateLimitError } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    await enforceRateLimit(`public:${clientIp(request)}`, 60, 60_000);
  } catch (e) {
    if (e instanceof RateLimitError) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    throw e;
  }
  const { token } = await params;
  const folder = await dbGet<{ id: string; name: string; user_id: string }>(
    "select id, name, user_id from folders where public_token = ?",
    [token]
  );
  if (!folder) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const allFolders = await dbAll<{ id: string; name: string; parent_id: string | null }>(
    "select id, name, parent_id from folders where user_id = ?",
    [folder.user_id]
  );

  const childrenByParent = new Map<string, string[]>();
  for (const f of allFolders) {
    if (f.parent_id) {
      childrenByParent.set(f.parent_id, [...(childrenByParent.get(f.parent_id) ?? []), f.id]);
    }
  }

  // BFS from root folder to collect all descendant ids
  const folderIds = [folder.id];
  for (let i = 0; i < folderIds.length; i++) {
    folderIds.push(...(childrenByParent.get(folderIds[i]) ?? []));
  }

  const allFolderMap = new Map(allFolders.map((f) => [f.id, f]));

  const placeholders = folderIds.map(() => "?").join(",");
  const notes = await dbAll<{ id: string; title: string; markdown_content: string; folder_id: string | null; updated_at: string }>(
    `select id, title, markdown_content, folder_id, updated_at from notes where folder_id in (${placeholders}) order by sort_order, title collate nocase`,
    folderIds
  );

  return NextResponse.json({
    folderName: folder.name,
    folderId: folder.id,
    folders: folderIds.map((fid) => {
      const f = allFolderMap.get(fid)!;
      return { id: f.id, name: f.name, parentId: f.parent_id };
    }),
    notes: notes.map((n) => ({
      id: n.id,
      title: n.title,
      markdownContent: n.markdown_content,
      folderId: n.folder_id,
      updatedAt: n.updated_at
    }))
  });
}
