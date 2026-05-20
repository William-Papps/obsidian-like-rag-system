import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthenticatedUser } from "@/lib/auth";
import { deleteNote, getNote, updateNote } from "@/lib/services/notes";

const updateSchema = z.object({
  title: z.string().optional(),
  folderId: z.string().nullable().optional(),
  markdownContent: z.string().optional(),
  sortOrder: z.number().int().optional(),
  department: z.string().nullable().optional(),
  effectiveDate: z.string().nullable().optional(),
  docStatus: z.enum(["draft", "active", "archived"]).nullable().optional(),
  docType: z.enum(["note", "document"]).nullable().optional()
});

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuthenticatedUser(async (user) => {
    const { id } = await params;
    const note = await getNote(user.id, id);
    return note ? NextResponse.json(note) : NextResponse.json({ error: "Not found" }, { status: 404 });
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuthenticatedUser(async (user) => {
    const { id } = await params;
    const body = updateSchema.parse(await request.json());
    const note = await updateNote(user.id, id, body);
    return note ? NextResponse.json(note) : NextResponse.json({ error: "Not found or no edit permission" }, { status: 404 });
  });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuthenticatedUser(async (user) => {
    const { id } = await params;
    const note = await getNote(user.id, id);
    if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await deleteNote(user.id, id);
    return NextResponse.json({ ok: true });
  });
}
