import { NextResponse } from "next/server";
import { withAuthenticatedUser } from "@/lib/auth";
import { listFolders } from "@/lib/services/folders";
import { createNote, listNotes } from "@/lib/services/notes";
import { getProviderSettings } from "@/lib/services/settings";
import { getIndexStatus } from "@/lib/rag/indexing";
import { dbAll } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return withAuthenticatedUser(async (user) => {
    let notes = await listNotes(user.id);
    if (notes.length === 0) {
      notes = [
        await createNote(user.id, {
          title: "Welcome to EternalNotes",
          markdownContent: `# Welcome to EternalNotes

This workspace stores Markdown notes locally and indexes them for grounded revision.

## Grounding rule

The assistant should answer only from notes you have written and indexed. If the evidence is not present, it should say the answer is not found in the notes.

## Start here

Create folders for classes, write source-backed notes, then use Reindex before asking questions or generating study tools.
`
        })
      ];
    }
    const [folders, settings, indexStatus, tagRows] = await Promise.all([
      listFolders(user.id),
      getProviderSettings(user.id),
      getIndexStatus(user.id),
      dbAll<{ note_id: string; tag_name: string }>(
        `select nt.note_id, t.name as tag_name
         from note_tags nt
         join tags t on t.id = nt.tag_id
         where t.user_id = ?`,
        [user.id]
      )
    ]);
    const noteTags: Record<string, string[]> = {};
    for (const row of tagRows) {
      if (!noteTags[row.note_id]) noteTags[row.note_id] = [];
      noteTags[row.note_id].push(row.tag_name);
    }
    return NextResponse.json({ user, folders, notes, settings, indexStatus, noteTags });
  });
}
