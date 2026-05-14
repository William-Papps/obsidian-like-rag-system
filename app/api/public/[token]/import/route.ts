import { NextResponse } from "next/server";
import { withAuthenticatedUser } from "@/lib/auth";
import { dbGet, dbRun } from "@/lib/db";
import { id, now, sha256 } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(_: Request, { params }: { params: Promise<{ token: string }> }) {
  return withAuthenticatedUser(async (user) => {
    const { token } = await params;
    const note = await dbGet<{ title: string; markdown_content: string }>(
      "select title, markdown_content from notes where public_token = ?",
      [token]
    );
    if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const timestamp = now();
    const newId = id();
    await dbRun(
      "insert into notes (id, user_id, folder_id, workspace_id, title, markdown_content, content_hash, doc_status, doc_type, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [newId, user.id, null, null, note.title, note.markdown_content, sha256(note.markdown_content), "active", "note", timestamp, timestamp]
    );

    return NextResponse.json({ noteId: newId });
  });
}
