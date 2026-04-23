import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getIndexStatus, reindexNotes } from "@/lib/rag/indexing";

export const dynamic = "force-dynamic";

const schema = z.object({ noteId: z.string().optional(), folderId: z.string().nullable().optional() });

export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json(await getIndexStatus(user.id));
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const body = schema.parse(await request.json().catch(() => ({})));
  const result = await reindexNotes(user.id, body);
  return NextResponse.json({ ...result, status: await getIndexStatus(user.id) });
}
