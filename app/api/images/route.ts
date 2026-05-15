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
  "image/webp": "webp"
};

function checkMagicBytes(buf: Buffer, mimeType: string): boolean {
  switch (mimeType) {
    case "image/png":
      return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
    case "image/jpeg":
      return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    case "image/gif":
      return buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38;
    case "image/webp":
      return buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
             buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50;
    default:
      return false;
  }
}

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

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!checkMagicBytes(buffer, file.type)) {
      return NextResponse.json({ error: "File contents do not match declared type" }, { status: 400 });
    }

    const imageId = id();
    const filename = `${imageId}.${ext}`;
    const dir = imagesDir();
    fs.mkdirSync(dir, { recursive: true });
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
