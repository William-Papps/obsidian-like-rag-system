import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { withAuthenticatedUser } from "@/lib/auth";
import { dbRun } from "@/lib/db";
import { id, now } from "@/lib/utils";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg"
};

function imagesDir() {
  const base = process.env.DATA_DIR?.trim() || path.join(process.env.APP_DIR?.trim() || process.cwd(), "data");
  return path.join(base, "images");
}

export async function POST(request: Request) {
  return withAuthenticatedUser(async (user) => {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const ext = ALLOWED_TYPES[file.type];
    if (!ext) return NextResponse.json({ error: "Unsupported image type" }, { status: 400 });

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Image too large (max 10 MB)" }, { status: 400 });
    }

    const imageId = id();
    const filename = `${imageId}.${ext}`;
    const dir = imagesDir();
    fs.mkdirSync(dir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(path.join(dir, filename), buffer);

    await dbRun("insert into images (id, user_id, filename, content_type, created_at) values (?, ?, ?, ?, ?)", [
      imageId,
      user.id,
      filename,
      file.type,
      now()
    ]);

    return NextResponse.json({ id: imageId, url: `/api/images/${imageId}` }, { status: 201 });
  });
}
