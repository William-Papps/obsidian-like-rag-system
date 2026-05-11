import fs from "fs";
import path from "path";
import { dbAll, dbGet, dbRun } from "@/lib/db";
import type { DocumentFile } from "@/lib/types";
import { id, now, sha256 } from "@/lib/utils";

function dataDir() {
  return process.env.DATA_DIR?.trim() || path.join(process.env.APP_DIR?.trim() || process.cwd(), "data");
}

function documentsDir(userId: string) {
  return path.join(dataDir(), "documents", userId);
}

export function getDocumentFilePath(userId: string, docId: string, fileType: string): string {
  return path.join(documentsDir(userId), `${docId}.${fileType}`);
}

function rowToDocumentFile(row: Record<string, unknown>): DocumentFile {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    title: row.title as string,
    filename: row.filename as string,
    fileType: row.file_type as DocumentFile["fileType"],
    fileSize: row.file_size as number,
    pageCount: row.page_count as number | null,
    contentHash: row.content_hash as string,
    shadowNoteId: row.shadow_note_id as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  };
}

async function extractPdfPages(buffer: Buffer): Promise<string[]> {
  // Dynamic import to stay server-side
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse") as (
    buffer: Buffer,
    options?: { pagerender?: (pageData: { getTextContent: () => Promise<{ items: Array<{ str: string }> }> }) => Promise<string> }
  ) => Promise<{ text: string; numpages: number }>;

  const pageTexts: string[] = [];

  const pagerender = async (pageData: { getTextContent: () => Promise<{ items: Array<{ str: string }> }> }): Promise<string> => {
    const content = await pageData.getTextContent();
    const text = content.items.map((item) => item.str).join(" ");
    pageTexts.push(text);
    return text;
  };

  const data = await pdfParse(buffer, { pagerender });

  if (pageTexts.length > 0) return pageTexts;

  // Fallback: split flat text by page count
  const totalPages = data.numpages || 1;
  const chunkSize = Math.ceil(data.text.length / totalPages);
  const fallback: string[] = [];
  for (let i = 0; i < totalPages; i++) {
    fallback.push(data.text.slice(i * chunkSize, (i + 1) * chunkSize));
  }
  return fallback;
}

async function extractDocxPages(buffer: Buffer): Promise<string[]> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mammoth = require("mammoth") as {
    extractRawText: (options: { buffer: Buffer }) => Promise<{ value: string }>;
  };
  const result = await mammoth.extractRawText({ buffer });
  const fullText = result.value;

  // Split at form feed or double newline into ~2000-char chunks
  const rawParts = fullText.split("\f").filter((p) => p.trim().length > 0);
  if (rawParts.length > 1) return rawParts;

  // Chunk by ~2000 chars at line boundaries
  const pages: string[] = [];
  const lines = fullText.split(/\r?\n/);
  let buf = "";
  for (const line of lines) {
    const next = buf ? `${buf}\n${line}` : line;
    if (next.length > 2000 && buf) {
      pages.push(buf);
      buf = line;
    } else {
      buf = next;
    }
  }
  if (buf.trim()) pages.push(buf);
  return pages.length ? pages : [fullText];
}

function extractTxtPages(buffer: Buffer): string[] {
  const fullText = buffer.toString("utf-8");
  const ffParts = fullText.split("\f").filter((p) => p.trim().length > 0);
  if (ffParts.length > 1) return ffParts;

  // Chunk at ~2000 chars by line boundaries
  const pages: string[] = [];
  const lines = fullText.split(/\r?\n/);
  let buf = "";
  for (const line of lines) {
    const next = buf ? `${buf}\n${line}` : line;
    if (next.length > 2000 && buf) {
      pages.push(buf);
      buf = line;
    } else {
      buf = next;
    }
  }
  if (buf.trim()) pages.push(buf);
  return pages.length ? pages : [fullText];
}

export async function uploadDocument(
  userId: string,
  buffer: Buffer,
  filename: string
): Promise<{ document: DocumentFile; shadowNoteId: string }> {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (!["pdf", "docx", "txt"].includes(ext)) {
    throw new Error(`Unsupported file type: ${ext}`);
  }
  const fileType = ext as "pdf" | "docx" | "txt";
  const title = filename.replace(/\.[^.]+$/, "");
  const contentHash = sha256(buffer.toString("base64"));
  const docId = id();

  // Extract pages
  let pages: string[];
  if (fileType === "pdf") {
    pages = await extractPdfPages(buffer);
  } else if (fileType === "docx") {
    pages = await extractDocxPages(buffer);
  } else {
    pages = extractTxtPages(buffer);
  }

  const pagesJson = JSON.stringify(pages);
  const pageCount = pages.length;

  // Save file to disk
  const dir = documentsDir(userId);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = getDocumentFilePath(userId, docId, fileType);
  fs.writeFileSync(filePath, buffer);

  const shadowNoteId = id();
  const ts = now();

  // Create shadow note (doc_type='document', hidden from normal listing)
  const shadowContent = pages.join("\n\n---\n\n");
  const shadowHash = sha256(shadowContent);
  await dbRun(
    `insert into notes (id, user_id, folder_id, title, markdown_content, content_hash, doc_type, source_document_id, created_at, updated_at)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [shadowNoteId, userId, null, title, shadowContent, shadowHash, "document", docId, ts, ts]
  );

  // Create document record
  await dbRun(
    `insert into documents (id, user_id, title, filename, file_type, file_size, page_count, pages_json, content_hash, shadow_note_id, created_at, updated_at)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [docId, userId, title, filename, fileType, buffer.length, pageCount, pagesJson, contentHash, shadowNoteId, ts, ts]
  );

  const document: DocumentFile = {
    id: docId,
    userId,
    title,
    filename,
    fileType,
    fileSize: buffer.length,
    pageCount,
    contentHash,
    shadowNoteId,
    createdAt: ts,
    updatedAt: ts
  };

  return { document, shadowNoteId };
}

export async function listDocuments(userId: string): Promise<DocumentFile[]> {
  const rows = await dbAll<Record<string, unknown>>(
    "select * from documents where user_id = ? order by created_at desc",
    [userId]
  );
  return rows.map(rowToDocumentFile);
}

export async function getDocument(userId: string, docId: string): Promise<DocumentFile | null> {
  const row = await dbGet<Record<string, unknown>>(
    "select * from documents where id = ? and user_id = ?",
    [docId, userId]
  );
  return row ? rowToDocumentFile(row) : null;
}

export async function getDocumentPages(docId: string): Promise<string[]> {
  const row = await dbGet<{ pages_json: string | null }>(
    "select pages_json from documents where id = ?",
    [docId]
  );
  if (!row?.pages_json) return [];
  try {
    return JSON.parse(row.pages_json) as string[];
  } catch {
    return [];
  }
}

export async function deleteDocument(userId: string, docId: string): Promise<void> {
  const doc = await getDocument(userId, docId);
  if (!doc) return;

  // Delete file from disk
  const filePath = getDocumentFilePath(userId, docId, doc.fileType);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  // Delete shadow note (cascades chunks)
  if (doc.shadowNoteId) {
    await dbRun("delete from chunks where note_id = ?", [doc.shadowNoteId]);
    await dbRun("delete from notes where id = ? and user_id = ?", [doc.shadowNoteId, userId]);
  }

  // Delete document record
  await dbRun("delete from documents where id = ? and user_id = ?", [docId, userId]);
}
