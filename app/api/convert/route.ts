import { NextRequest, NextResponse } from "next/server";
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

// ── main PDF converter ────────────────────────────────────────────────────────
async function convertPdfToMarkdown(
  buffer: Buffer,
  userId: string,
  getAiContext: (() => Promise<AiContext>) | null
): Promise<{ markdown: string; warnings: string[] }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs" as string) as any;
  // v5 requires a real workerSrc even in fake-worker (in-process) mode
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(
    path.resolve(process.cwd(), "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs")
  ).href;

  const pdfjsRoot = pathToFileURL(path.resolve(process.cwd(), "node_modules/pdfjs-dist")).href;

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    isEvalSupported: false,
    disableFontFace: true,
    // Providing cMap + standard font paths lets pdfjs decode non-latin
    // and custom-encoded text that would otherwise come back as empty strings.
    cMapUrl: `${pdfjsRoot}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${pdfjsRoot}/standard_fonts/`,
  });

  const doc = await loadingTask.promise;
  const numPages: number = doc.numPages;
  const pageTexts: string[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const textContent = await page.getTextContent({ includeMarkedContent: true });

    // Flat extraction — just concatenate items in order.
    // pdfjs returns them roughly in reading order; hasEOL marks real line breaks.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pageText = (textContent.items as any[])
      .filter((item) => typeof item.str === "string")
      .map((item) => (item.hasEOL ? item.str + "\n" : item.str))
      .join("")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    pageTexts.push(pageText);
    await page.cleanup();
  }

  // ── Assess text quality ───────────────────────────────────────────────────
  const fullText = pageTexts
    .map((t, i) => (t.trim() ? (i > 0 ? `\n---\n\n${t}` : t) : ""))
    .filter(Boolean)
    .join("\n")
    .trim();

  const textChars = pageTexts.reduce((s, t) => s + t.trim().length, 0);
  const charsPerPage = numPages > 0 ? textChars / numPages : 0;
  const isSparse = charsPerPage < 60;

  const warnings: string[] = [];

  // ── Canvas OCR fallback for truly image-based PDFs ────────────────────────
  if (isSparse && getAiContext) {
    const ai = await getAiContext().catch(() => null);
    if (ai?.apiKey) {
      const ocrParts: string[] = [];
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { createCanvas } = await import("@napi-rs/canvas") as any;
        const scale = 1.5;
        const maxPages = Math.min(numPages, 10);

        for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
          try {
            const page = await doc.getPage(pageNum);
            const viewport = page.getViewport({ scale });
            const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
            const ctx = canvas.getContext("2d");
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const canvasFactory = {
              create: (w: number, h: number) => { const c = createCanvas(w, h); return { canvas: c, context: c.getContext("2d") }; },
              reset: (cc: any, w: number, h: number) => { cc.canvas.width = w; cc.canvas.height = h; },
              destroy: (_cc: any) => {},
            };
            await page.render({ canvasContext: ctx, viewport, canvasFactory }).promise;
            await page.cleanup();
            const pngBuf: Buffer = canvas.toBuffer("image/png");
            const extracted = await extractTextFromImage(userId, {
              bytes: pngBuf, contentType: "image/png", label: `PDF page ${pageNum}`
            }, ai);
            if (extracted.text?.trim()) ocrParts.push(extracted.text.trim());
          } catch { /* skip page */ }
        }
      } catch { /* canvas not available */ }

      if (ocrParts.length > 0) {
        try { await doc.cleanup?.(); } catch { /* ignore */ }
        return {
          markdown: ocrParts.join("\n\n"),
          warnings: [`Content extracted via OCR from ${ocrParts.length} page(s).`]
        };
      }
    }
  }

  try { await doc.cleanup?.(); } catch { /* ignore */ }

  if (!fullText) {
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
