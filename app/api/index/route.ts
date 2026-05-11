import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthenticatedUser } from "@/lib/auth";
import { getIndexStatus, reindexNotes } from "@/lib/rag/indexing";
import { QuotaExceededError } from "@/lib/services/quotas";

export const dynamic = "force-dynamic";

const schema = z.object({ noteId: z.string().optional(), folderId: z.string().nullable().optional() });

export async function GET() {
  return withAuthenticatedUser(async (user) => NextResponse.json(await getIndexStatus(user.id)));
}

export async function POST(request: Request) {
  return withAuthenticatedUser(async (user) => {
    try {
      const body = schema.parse(await request.json().catch(() => ({})));
      const result = await reindexNotes(user.id, body);
      return NextResponse.json({ ...result, status: await getIndexStatus(user.id) });
    } catch (error) {
      if (error instanceof QuotaExceededError) {
        return NextResponse.json({ error: error.message, feature: error.feature }, { status: 429 });
      }
      const message = error instanceof Error ? error.message : "Indexing failed";
      console.error("[index] reindex failed", error);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}
