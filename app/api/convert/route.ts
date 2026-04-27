import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import { withAuthenticatedUser } from "@/lib/auth";
import { extractTextFromImage } from "@/lib/import/vision";
import { QuotaExceededError, resolveAiContext } from "@/lib/services/ai-access";
import { recordStudyActivity } from "@/lib/services/study-history";
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

async function convertTextToMarkdown(text: string): Promise<string> {
  return text
    .replace(/^\uFEFF/, "")
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
          const result = await convertDocxToMarkdown(user.id, buffer);
          markdown = result.markdown;
          warnings.push(...result.warnings);
        } else if (fileName.endsWith(".doc")) {
          return NextResponse.json(
            { error: "Classic .doc files are not fully supported. Please convert to .docx format first." },
            { status: 400 }
          );
        } else if (file.type.startsWith("image/") || /\.(png|jpg|jpeg|webp|gif|bmp|tif|tiff)$/i.test(fileName)) {
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
