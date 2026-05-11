import { NextResponse } from "next/server";
import { withAuthenticatedUser } from "@/lib/auth";
import { uploadDocument, listDocuments } from "@/lib/services/documents";
import { reindexNotes } from "@/lib/rag/indexing";
import { dbGet } from "@/lib/db";
import type { Note } from "@/lib/types";
import { toCamelRecord } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  return withAuthenticatedUser(async (user) => {
    const documents = await listDocuments(user.id);
    return NextResponse.json(documents);
  });
}

export async function POST(request: Request) {
  return withAuthenticatedUser(async (user) => {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
    }

    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = file.name;

    let result: { document: import("@/lib/types").DocumentFile; shadowNoteId: string };
    try {
      result = await uploadDocument(user.id, buffer, filename);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    // Trigger indexing of the shadow note
    try {
      const shadowRow = await dbGet<Record<string, unknown>>(
        "select * from notes where id = ?",
        [result.shadowNoteId]
      );
      if (shadowRow) {
        const shadowNote = toCamelRecord(shadowRow) as Note;
        await reindexNotes(user.id, { noteId: shadowNote.id });
      }
    } catch (err) {
      console.error("[documents] indexing failed after upload", err);
      // Don't fail the upload if indexing errors
    }

    return NextResponse.json(result.document);
  });
}
