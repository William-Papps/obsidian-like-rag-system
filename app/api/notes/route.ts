import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthenticatedUser } from "@/lib/auth";
import { createNote, exactSearch, listNotes } from "@/lib/services/notes";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  title: z.string().optional(),
  folderId: z.string().nullable().optional(),
  markdownContent: z.string().optional()
});

export async function GET(request: Request) {
  return withAuthenticatedUser(async (user) => {
    const url = new URL(request.url);
    const query = url.searchParams.get("q");
    if (query) return NextResponse.json(await exactSearch(user.id, query));
    return NextResponse.json(await listNotes(user.id));
  });
}

export async function POST(request: Request) {
  return withAuthenticatedUser(async (user) => {
    const body = createSchema.parse(await request.json());
    return NextResponse.json(await createNote(user.id, body), { status: 201 });
  });
}
