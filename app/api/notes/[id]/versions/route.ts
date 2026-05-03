import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthenticatedUser } from "@/lib/auth";
import { listNoteVersions, restoreNoteVersion } from "@/lib/services/notes";

export const dynamic = "force-dynamic";

const restoreSchema = z.object({ versionId: z.string().min(1) });

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuthenticatedUser(async (user) => {
    const { id } = await params;
    return NextResponse.json(await listNoteVersions(user.id, id));
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuthenticatedUser(async (user) => {
    const { id } = await params;
    const { versionId } = restoreSchema.parse(await request.json());
    const note = await restoreNoteVersion(user.id, id, versionId);
    return note ? NextResponse.json(note) : NextResponse.json({ error: "Version not found" }, { status: 404 });
  });
}
