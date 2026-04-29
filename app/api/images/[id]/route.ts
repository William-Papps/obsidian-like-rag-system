import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { dbGet } from "@/lib/db";
import { getCurrentUserOptional } from "@/lib/auth";

export const dynamic = "force-dynamic";

function imagesDir() {
  const base = process.env.DATA_DIR?.trim() || path.join(process.env.APP_DIR?.trim() || process.cwd(), "data");
  return path.join(base, "images");
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserOptional();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const row = await dbGet<{ filename: string; content_type: string; user_id: string }>(
    "select filename, content_type, user_id from images where id = ?",
    [id]
  );
  if (!row || row.user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const filePath = path.join(imagesDir(), row.filename);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buffer = fs.readFileSync(filePath);
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "content-type": row.content_type,
      "cache-control": "private, max-age=31536000, immutable"
    }
  });
}
