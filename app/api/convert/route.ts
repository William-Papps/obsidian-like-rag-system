import { NextRequest, NextResponse } from "next/server";
import { deflateSync } from "zlib";
import path from "path";
import { pathToFileURL } from "url";
import mammoth from "mammoth";
import { withAuthenticatedUser } from "@/lib/auth";
import { extractTextFromImage } from "@/lib/import/vision";
import { QuotaExceededError, checkHostedQuota, resolveAiContext } from "@/lib/services/ai-access";
import type { AiContext } from "@/lib/types";

type MammothMarkdownAdapter = {
  convertToMarkdown: (
    input: { arrayBuffer: ArrayBuffer },
    options?: { convertImage?: unknown }
  ) => Promise<{ value: string }>;
};

async function convertDocxToMarkdown(userId: string, buffer: Buffer): Promise<{ markdown: string; warnings: string[] }> {
  try {
    const bytes = Uint8Array.from(buffer);
    const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const imageSections: string[] = [];
    const warnings: string[] = [];
    let imageIndex = 0;
    let context: AiContext | null = null;
    const result = await (mammoth as unknown as MammothMarkdownAdapter).convertToMarkdown(
      { arrayBuffer },
      {
        convertImage: mammoth.images.imgElement(async (image) => {
          imageIndex += 1;
          if (!context) context = await resolveAiContext(userId, "ocr");
          const imageBuffer = await image.readAsBuffer();
          const extracted = await extractTextFromImage(userId, {
            bytes: imageBuffer,
            contentType: image.contentType || "image/png",
            label: `embedded image ${imageIndex}`
          }, context);
          if (extracted.text) {
            imageSections.push(`## Embedded image ${imageIndex} text\n\n${extracted.text}`);
          }
          if (extracted.warning) warnings.push(extracted.warning);
          return { src: "" };
        })
      }
    );
    const markdown = [result.value.replace(/!\[[^\]]*]\(\s*\)/g, "").trim(), ...imageSections].filter(Boolean).join("\n\n");
    return { markdown, warnings };
  } catch (error) {
    throw new Error(`Failed to convert DOCX: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

// ── PNG encoder (no external deps) ───────────────────────────────────────────
// Pre-build CRC32 lookup table for PNG chunk validation
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xFF]! ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.allocUnsafe(4);
  len.writeUInt32BE(data.length, 0);
  const typeBytes = Buffer.from(type, "ascii");
  const crcInput = Buffer.concat([typeBytes, data]);
  const crc = Buffer.allocUnsafe(4);
  crc.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, typeBytes, data, crc]);
}

// Encode raw pixel data (as returned by pdfjs-dist) to a PNG buffer.
// kind: 1=GRAYSCALE_1BPP, 2=RGB_24BPP, 3=RGBA_32BPP (pdfjs OPS.ImageKind)
function encodeAsPng(width: number, height: number, data: Uint8ClampedArray | Uint8Array, kind: number): Buffer {
  // Normalise to RGBA
  const rgba = new Uint8Array(width * height * 4);
  const src = data instanceof Uint8ClampedArray ? data : new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength);
  if (kind === 3) {
    // Already RGBA
    rgba.set(src.slice(0, width * height * 4));
  } else if (kind === 2) {
    // RGB → RGBA
    for (let i = 0; i < width * height; i++) {
      rgba[i * 4] = src[i * 3] ?? 0;
      rgba[i * 4 + 1] = src[i * 3 + 1] ?? 0;
      rgba[i * 4 + 2] = src[i * 3 + 2] ?? 0;
      rgba[i * 4 + 3] = 255;
    }
  } else {
    // Grayscale or 1bpp → RGBA
    for (let i = 0; i < width * height; i++) {
      const v = src[i] ?? 0;
      rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = v;
      rgba[i * 4 + 3] = 255;
    }
  }

  // Build raw scanlines with filter byte 0 (None)
  const raw = Buffer.allocUnsafe(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    for (let x = 0; x < width * 4; x++) {
      raw[y * (width * 4 + 1) + 1 + x] = rgba[y * width * 4 + x] ?? 0;
    }
  }

  const ihdrData = Buffer.allocUnsafe(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 6;  // colour type: RGBA
  ihdrData[10] = ihdrData[11] = ihdrData[12] = 0;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    pngChunk("IHDR", ihdrData),
    pngChunk("IDAT", deflateSync(raw, { level: 6 })),
    pngChunk("IEND", Buffer.alloc(0))
  ]);
}

// ── pdfjs text reconstruction ─────────────────────────────────────────────────
type TextItem = {
  str: string;
  transform: number[]; // [a, b, c, d, tx, ty]
  width?: number;
  hasEOL?: boolean;
};

function reconstructTextFromPage(items: TextItem[]): string {
  if (items.length === 0) return "";

  // Estimate average font height from transform[0] (scale x ≈ font size)
  const avgSize = items.reduce((s, it) => s + Math.abs(it.transform[0] ?? 12), 0) / items.length;
  const lineGap = Math.max(avgSize * 0.4, 3);

  // Group items into lines by y-coordinate
  const lines: Array<{ y: number; items: TextItem[] }> = [];
  for (const item of items) {
    if (!item.str.trim() && !item.hasEOL) continue;
    const y = item.transform[5] ?? 0;
    const line = lines.find((l) => Math.abs(l.y - y) <= lineGap);
    if (line) {
      line.items.push(item);
    } else {
      lines.push({ y, items: [item] });
    }
  }

  // Sort lines top-to-bottom (PDF y-axis is bottom-up, higher y = higher on page)
  lines.sort((a, b) => b.y - a.y);

  return lines
    .map((line) => {
      line.items.sort((a, b) => (a.transform[4] ?? 0) - (b.transform[4] ?? 0));
      return line.items.map((it) => it.str).join(" ").trim();
    })
    .filter(Boolean)
    .join("\n");
}

// ── Raw JPEG extractor for scanned PDFs ──────────────────────────────────────
// Scanned PDFs store each page as a JPEG stream (DCTDecode). When pdfjs can't
// decode images without a canvas, we fall back to scanning the raw bytes.
function extractJpegsFromBuffer(buf: Buffer): Buffer[] {
  const jpegs: Buffer[] = [];
  let i = 0;

  while (i < buf.length - 3) {
    // JPEG SOI = FF D8, must be followed by FF (next marker byte)
    if (buf[i] !== 0xFF || buf[i + 1] !== 0xD8 || buf[i + 2] !== 0xFF) { i++; continue; }

    const start = i;
    let pos = i + 2;
    let found = false;

    try {
      outer: while (pos < buf.length - 1) {
        if (buf[pos] !== 0xFF) break;
        const marker = buf[pos + 1];
        pos += 2;

        if (marker === 0xD9) { // EOI
          if (pos - start >= 10_000) jpegs.push(buf.slice(start, pos));
          found = true;
          break;
        }
        if (marker >= 0xD0 && marker <= 0xD7) continue; // RST — no length
        if (marker === 0xD8) break; // nested SOI — bail

        if (pos + 2 > buf.length) break;
        const segLen = buf.readUInt16BE(pos);
        if (segLen < 2) break;

        if (marker === 0xDA) { // SOS — scan data follows
          pos += segLen;
          while (pos < buf.length - 1) {
            if (buf[pos] === 0xFF) {
              const next = buf[pos + 1];
              if (next === 0x00) { pos += 2; continue; } // stuffed byte
              if (next >= 0xD0 && next <= 0xD7) { pos += 2; continue; } // RST
              continue outer; // real marker — outer loop will handle it
            }
            pos++;
          }
          break;
        } else {
          pos += segLen;
        }
      }
    } catch { /* malformed segment — skip */ }

    i = found ? pos : start + 1;
  }

  return jpegs;
}

// ── main PDF converter ────────────────────────────────────────────────────────
async function convertPdfToMarkdown(
  buffer: Buffer,
  userId: string,
  getAiContext: (() => Promise<AiContext>) | null
): Promise<{ markdown: string; warnings: string[] }> {
  // Dynamic import — pdfjs-dist legacy ESM build works in Node.js
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs" as string) as any;
  // v5 requires a non-empty workerSrc even for in-process (fake) worker mode
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(
    path.resolve(process.cwd(), "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs")
  ).href;

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    isEvalSupported: false,
    disableFontFace: true,
    cMapUrl: undefined,
    standardFontDataUrl: undefined,
  });

  const doc = await loadingTask.promise;
  const numPages: number = doc.numPages;
  const pageTexts: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const embeddedImages: Array<{ width: number; height: number; data: Uint8ClampedArray; kind: number }> = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await doc.getPage(pageNum);

    // ── Text extraction ──────────────────────────────────────────────────
    const textContent = await page.getTextContent();
    const pageText = reconstructTextFromPage(textContent.items as TextItem[]);
    pageTexts.push(pageText);

    // ── Embedded image extraction (for sparse-text PDFs) ─────────────────
    try {
      const OPS = pdfjs.OPS;
      const opList = await page.getOperatorList();
      const fns: number[] = opList.fnArray;
      const argsList: unknown[][] = opList.argsArray;

      for (let i = 0; i < fns.length; i++) {
        const fn = fns[i];

        // Inline images carry their pixel data directly in the operator args
        if (fn === OPS.paintInlineImageXObject) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const imgData = (argsList[i] as any[])[0];
          if (imgData?.data && imgData.width > 10 && imgData.height > 10) {
            embeddedImages.push({ width: imgData.width, height: imgData.height, data: imgData.data, kind: imgData.kind ?? 2 });
          }
        }

        // XObject images are referenced by name; look them up from page.objs
        if (fn === OPS.paintImageXObject) {
          const name = (argsList[i] as string[])[0];
          if (name) {
            await new Promise<void>((resolve) => {
              try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                page.objs.get(name, (imgData: any) => {
                  if (imgData?.data && imgData.width > 10 && imgData.height > 10) {
                    embeddedImages.push({ width: imgData.width, height: imgData.height, data: imgData.data, kind: imgData.kind ?? 2 });
                  }
                  resolve();
                });
              } catch {
                resolve();
              }
            });
          }
        }
      }
    } catch { /* Image extraction is best-effort */ }

    await page.cleanup();
  }

  try { await doc.cleanup?.(); } catch { /* ignore */ }

  // ── Assess text quality ───────────────────────────────────────────────────
  const fullText = pageTexts
    .map((t, i) => (t.trim() ? (i > 0 ? `\n---\n\n${t}` : t) : (i > 0 ? `\n---\n\n*(Page ${i + 1} — no text layer)*` : `*(Page ${i + 1} — no text layer)*`)))
    .join("\n")
    .trim();

  const textChars = pageTexts.reduce((s, t) => s + t.trim().length, 0);
  const charsPerPage = numPages > 0 ? textChars / numPages : 0;
  const isSparse = charsPerPage < 60;

  const warnings: string[] = [];

  // ── OCR fallback for image-heavy PDFs ────────────────────────────────────
  if (isSparse && getAiContext) {
    const ai = await getAiContext().catch(() => null);
    if (ai?.apiKey) {
      const ocrParts: string[] = [];

      // Path A: pdfjs gave us decoded pixel data (works for inline images)
      for (const img of embeddedImages.slice(0, 12)) {
        try {
          if (img.width < 50 || img.height < 50) continue;
          const pngBuf = encodeAsPng(img.width, img.height, img.data, img.kind);
          const extracted = await extractTextFromImage(userId, {
            bytes: pngBuf,
            contentType: "image/png",
            label: `PDF image ${ocrParts.length + 1}`
          }, ai);
          if (extracted.text?.trim()) ocrParts.push(extracted.text.trim());
        } catch { /* skip */ }
      }

      // Path B: scanned PDFs store pages as raw JPEG streams — extract directly
      if (ocrParts.length === 0) {
        const rawJpegs = extractJpegsFromBuffer(buffer);
        for (const jpegBuf of rawJpegs.slice(0, 12)) {
          try {
            const extracted = await extractTextFromImage(userId, {
              bytes: jpegBuf,
              contentType: "image/jpeg",
              label: `PDF scan ${ocrParts.length + 1}`
            }, ai);
            if (extracted.text?.trim()) ocrParts.push(extracted.text.trim());
          } catch { /* skip */ }
        }
      }

      if (ocrParts.length > 0) {
        return {
          markdown: ocrParts.join("\n\n"),
          warnings: [`Content extracted via OCR from ${ocrParts.length} scanned page(s) in the PDF.`]
        };
      }
    }
  }

  if (isSparse) {
    warnings.push(
      "This PDF appears to contain mainly charts or images with little text layer. " +
      "For best results, export individual pages as PNG/JPG images and upload them — " +
      "the OCR feature will extract chart labels, captions, and surrounding text."
    );
  }

  if (!fullText.replace(/\*(Page \d+ — no text layer)\*/g, "").trim()) {
    if (warnings.length) return { markdown: "", warnings };
    return {
      markdown: "",
      warnings: ["No readable text could be extracted from this PDF. Try uploading individual pages as images instead."]
    };
  }

  return { markdown: fullText, warnings };
}

async function convertTextToMarkdown(text: string): Promise<string> {
  return text
    .replace(/^﻿/, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

export async function POST(request: NextRequest) {
  return withAuthenticatedUser(async (user) => {
    try {
      const formData = await request.formData();
      const file = formData.get("file") as File;
      const textContent = formData.get("text") as string;

      if (!file && !textContent) {
        return NextResponse.json({ error: "No file or text provided" }, { status: 400 });
      }

      let markdown = "";
      const warnings: string[] = [];

      if (textContent) {
        markdown = await convertTextToMarkdown(textContent);
      } else if (file) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const fileName = file.name.toLowerCase();

        if (fileName.endsWith(".docx") || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
          if (file.size > 20 * 1024 * 1024) {
            return NextResponse.json({ error: "DOCX file too large (max 20 MB)" }, { status: 400 });
          }
          await checkHostedQuota(user.id, "ocr");
          const result = await convertDocxToMarkdown(user.id, buffer);
          markdown = result.markdown;
          warnings.push(...result.warnings);
        } else if (fileName.endsWith(".pdf") || file.type === "application/pdf") {
          if (file.size > 50 * 1024 * 1024) {
            return NextResponse.json({ error: "PDF file too large (max 50 MB)" }, { status: 400 });
          }
          // Provide AI context lazily so OCR is only used when actually needed
          const getAiContext = () => resolveAiContext(user.id, "ocr");
          const result = await convertPdfToMarkdown(buffer, user.id, getAiContext);
          markdown = result.markdown;
          warnings.push(...result.warnings);
        } else if (fileName.endsWith(".doc")) {
          return NextResponse.json(
            { error: "Classic .doc files are not fully supported. Please convert to .docx format first." },
            { status: 400 }
          );
        } else if (file.type.startsWith("image/") || /\.(png|jpg|jpeg|webp|gif|bmp|tif|tiff)$/i.test(fileName)) {
          await checkHostedQuota(user.id, "ocr");
          const ai = await resolveAiContext(user.id, "ocr");
          const extracted = await extractTextFromImage(user.id, {
            bytes: buffer,
            contentType: file.type || inferImageContentType(fileName),
            label: file.name
          }, ai);
          if (!extracted.text) {
            return NextResponse.json({ error: extracted.warning ?? "No readable text found in image." }, { status: 400 });
          }
          markdown = `# ${stripExtension(file.name)}\n\n${extracted.text}`;
          if (extracted.warning) warnings.push(extracted.warning);
        } else if (
          fileName.endsWith(".txt") ||
          fileName.endsWith(".md") ||
          fileName.endsWith(".markdown") ||
          fileName.endsWith(".text") ||
          file.type.startsWith("text/")
        ) {
          markdown = await convertTextToMarkdown(buffer.toString("utf-8"));
        } else {
          try {
            markdown = await convertTextToMarkdown(buffer.toString("utf-8"));
          } catch {
            return NextResponse.json(
              { error: `Unsupported file format: ${file.type || "unknown"}` },
              { status: 400 }
            );
          }
        }
      }

      markdown = markdown.replace(/\r\n?/g, "\n").replace(/\n{4,}/g, "\n\n\n").trim();
      if (!markdown) {
        return NextResponse.json(
          {
            error: warnings[0] ?? "No note text could be extracted from this file.",
            warnings
          },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        markdown,
        fileName: file?.name || "pasted-content",
        warnings
      });
    } catch (error) {
      if (error instanceof QuotaExceededError) {
        return NextResponse.json({ error: error.message }, { status: 402 });
      }
      console.error("Conversion error:", error);
      return NextResponse.json({ error: error instanceof Error ? error.message : "Conversion failed" }, { status: 500 });
    }
  });
}

function stripExtension(fileName: string) {
  return fileName.replace(/\.[^/.]+$/, "");
}

function inferImageContentType(fileName: string) {
  if (fileName.endsWith(".png")) return "image/png";
  if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) return "image/jpeg";
  if (fileName.endsWith(".webp")) return "image/webp";
  if (fileName.endsWith(".gif")) return "image/gif";
  if (fileName.endsWith(".bmp")) return "image/bmp";
  if (fileName.endsWith(".tif") || fileName.endsWith(".tiff")) return "image/tiff";
  return "image/png";
}
