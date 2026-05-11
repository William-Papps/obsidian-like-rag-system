import { NextResponse } from "next/server";
import { withAuthenticatedUser } from "@/lib/auth";
import { listFolders } from "@/lib/services/folders";
import { createNote, listNotes } from "@/lib/services/notes";
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

    let notes = notesRaw;
    if (notes.length === 0) {
      notes = [
        await createNote(user.id, {
          title: "Welcome to EternalNotes",
          markdownContent: `# Welcome to EternalNotes

This is your AI-powered knowledge base. Add documents, index them, and query them with natural language.

## How grounding works

The AI answers only from documents you have added and indexed. If the answer isn't in your knowledge base, it will say so.

## Getting started

1. Create a project folder for your team or topic
2. Add documents — paste text, import files, or write directly
3. Click Reindex to make documents queryable
4. Use the Ask, Briefing, and Knowledge Check tools on the right
`
        })
      ];
    }
    const noteTags: Record<string, string[]> = {};
    for (const row of tagRows) {
      if (!noteTags[row.note_id]) noteTags[row.note_id] = [];
      noteTags[row.note_id].push(row.tag_name);
    }
    return NextResponse.json({ user, folders, notes, settings, indexStatus, noteTags, workspaces, documents });
  });
}
