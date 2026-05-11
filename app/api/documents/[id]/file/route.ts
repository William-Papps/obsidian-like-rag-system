import fs from "fs";
import { withAuthenticatedUser } from "@/lib/auth";
import { getDocument, getDocumentFilePath } from "@/lib/services/documents";

export const dynamic = "force-dynamic";

const CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain"
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuthenticatedUser(async (user) => {
    const { id } = await params;
    const doc = await getDocument(user.id, id);
    if (!doc) {
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
    }

    const filePath = getDocumentFilePath(user.id, id, doc.fileType);
    if (!fs.existsSync(filePath)) {
      return new Response(JSON.stringify({ error: "File not found on disk" }), { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const contentType = CONTENT_TYPES[doc.fileType] ?? "application/octet-stream";

    return new Response(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${doc.filename}"`,
        "Cache-Control": "private, max-age=3600"
      }
    });
  });
}
