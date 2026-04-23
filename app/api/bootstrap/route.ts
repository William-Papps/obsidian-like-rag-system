import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listFolders } from "@/lib/services/folders";
import { createNote, listNotes } from "@/lib/services/notes";
import { getProviderSettings } from "@/lib/services/settings";
import { getIndexStatus } from "@/lib/rag/indexing";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  let notes = await listNotes(user.id);
  if (notes.length === 0) {
    notes = [
      await createNote(user.id, {
        title: "Welcome to StudyOS",
        markdownContent: `# Welcome to StudyOS

This workspace stores Markdown notes locally and indexes them for grounded revision.

## Grounding rule

The assistant should answer only from notes you have written and indexed. If the evidence is not present, it should say the answer is not found in the notes.

## Start here

Create folders for classes, write source-backed notes, then use Reindex before asking questions or generating study tools.
`
      })
    ];
  }
  return NextResponse.json({
    user,
    folders: await listFolders(user.id),
    notes,
    settings: await getProviderSettings(user.id),
    indexStatus: await getIndexStatus(user.id)
  });
}
