import { NextResponse } from "next/server";
import { withAuthenticatedUser } from "@/lib/auth";
import { dbAll } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return withAuthenticatedUser(async (user) => {
    const [notes, folders, tags, noteTags] = await Promise.all([
      dbAll<Record<string, unknown>>(
        "select id, title, markdown_content, folder_id, doc_type, doc_status, created_at, updated_at from notes where user_id = ? and workspace_id is null and coalesce(doc_type,'note') != 'document' order by updated_at desc",
        [user.id]
      ),
      dbAll<Record<string, unknown>>(
        "select id, parent_id, name, created_at from folders where user_id = ? order by name asc",
        [user.id]
      ),
      dbAll<Record<string, unknown>>(
        "select id, name, color from tags where user_id = ? order by name asc",
        [user.id]
      ),
      dbAll<Record<string, unknown>>(
        "select nt.note_id, t.name as tag_name from note_tags nt join tags t on t.id = nt.tag_id where t.user_id = ?",
        [user.id]
      )
    ]);

    const tagsByNote: Record<string, string[]> = {};
    for (const row of noteTags) {
      const noteId = row.note_id as string;
      if (!tagsByNote[noteId]) tagsByNote[noteId] = [];
      tagsByNote[noteId].push(row.tag_name as string);
    }

    const payload = {
      exportedAt: new Date().toISOString(),
      user: { id: user.id, name: user.name, email: user.email },
      folders,
      notes: notes.map((n) => ({ ...n, tags: tagsByNote[n.id as string] ?? [] })),
      tags
    };

    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "content-type": "application/json",
        "content-disposition": `attachment; filename="eternalnotes-export-${date}.json"`
      }
    });
  });
}
