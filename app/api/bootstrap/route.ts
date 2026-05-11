import { NextResponse } from "next/server";
import { withAuthenticatedUser } from "@/lib/auth";
import { listFolders } from "@/lib/services/folders";
import { listNotes } from "@/lib/services/notes";
import { getProviderSettings } from "@/lib/services/settings";
import { getIndexStatus } from "@/lib/rag/indexing";
import { listUserWorkspaces } from "@/lib/services/workspaces";
import { listDocuments } from "@/lib/services/documents";
import { dbAll } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return withAuthenticatedUser(async (user) => {
    const [notesRaw, folders, settings, indexStatus, tagRows, workspaces, documents] = await Promise.all([
      listNotes(user.id),
      listFolders(user.id),
      getProviderSettings(user.id),
      getIndexStatus(user.id),
      dbAll<{ note_id: string; tag_name: string }>(
        `select nt.note_id, t.name as tag_name
         from note_tags nt
         join tags t on t.id = nt.tag_id
         where t.user_id = ?`,
        [user.id]
      ),
      listUserWorkspaces(user.id),
      listDocuments(user.id)
    ]);

    const notes = notesRaw;
    const noteTags: Record<string, string[]> = {};
    for (const row of tagRows) {
      if (!noteTags[row.note_id]) noteTags[row.note_id] = [];
      noteTags[row.note_id].push(row.tag_name);
    }
    return NextResponse.json({ user, folders, notes, settings, indexStatus, noteTags, workspaces, documents });
  });
}
