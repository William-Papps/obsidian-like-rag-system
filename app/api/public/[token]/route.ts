import { NextResponse } from "next/server";
import { dbGet } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const row = await dbGet<{ id: string; title: string; markdown_content: string; updated_at: string }>(
    "select id, title, markdown_content, updated_at from notes where public_token = ?",
    [token]
  );
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    id: row.id,
    title: row.title,
    markdownContent: row.markdown_content,
    updatedAt: row.updated_at
  });
}
