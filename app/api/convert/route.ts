import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import { getCurrentUser } from "@/lib/auth";

type MammothMarkdownAdapter = {
  convertToMarkdown: (input: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>;
};

async function convertDocxToMarkdown(buffer: Buffer): Promise<string> {
  try {
    const bytes = Uint8Array.from(buffer);
    const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const result = await (mammoth as unknown as MammothMarkdownAdapter).convertToMarkdown({ arrayBuffer });
    return result.value;
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
  try {
    await getCurrentUser();
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const textContent = formData.get("text") as string;

    if (!file && !textContent) {
      return NextResponse.json({ error: "No file or text provided" }, { status: 400 });
    }

    let markdown = "";

    if (textContent) {
      // Handle pasted text content
      markdown = await convertTextToMarkdown(textContent);
    } else if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith(".docx") || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        markdown = await convertDocxToMarkdown(buffer);
      } else if (fileName.endsWith(".doc")) {
        return NextResponse.json(
          { error: "Classic .doc files are not fully supported. Please convert to .docx format first." },
          { status: 400 }
        );
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

    return NextResponse.json({
      success: true,
      markdown,
      fileName: file?.name || "pasted-content"
    });
  } catch (error) {
    console.error("Conversion error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Conversion failed" }, { status: 500 });
  }
}
