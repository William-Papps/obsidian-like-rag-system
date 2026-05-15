import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthenticatedUser } from "@/lib/auth";
import { addNoteTag, getNoteTags, removeNoteTag, setNoteTags } from "@/lib/services/tags";
import { getNote } from "@/lib/services/notes";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuthenticatedUser(async (user) => {
    const { id } = await params;
    const note = await getNote(user.id, id);
    if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(await getNoteTags(id));
  });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuthenticatedUser(async (user) => {
    const { id } = await params;
    const note = await getNote(user.id, id);
    if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const { tagIds } = z.object({ tagIds: z.array(z.string()) }).parse(await request.json());
    await setNoteTags(id, tagIds, user.id);
    return NextResponse.json(await getNoteTags(id));
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuthenticatedUser(async (user) => {
    const { id } = await params;
    const note = await getNote(user.id, id);
    if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const { tagId } = z.object({ tagId: z.string() }).parse(await request.json());
    await addNoteTag(id, tagId, user.id);
    return NextResponse.json(await getNoteTags(id));
  });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuthenticatedUser(async (user) => {
    const { id } = await params;
    const note = await getNote(user.id, id);
    if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const { tagId } = z.object({ tagId: z.string() }).parse(await request.json());
    await removeNoteTag(id, tagId);
    return NextResponse.json({ ok: true });
  });
}
