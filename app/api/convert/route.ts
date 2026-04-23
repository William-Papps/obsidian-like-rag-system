import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";

async function convertDocxToMarkdown(buffer: Buffer): Promise<string> {
  try {
    const result = await (mammoth as any).convertToMarkdown({ arrayBuffer: buffer });
    return result.value;
  } catch (error) {
    throw new Error(`Failed to convert DOCX: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

async function convertTextToMarkdown(text: string): Promise<string> {
  // Simple text to markdown conversion
  // Preserve line breaks and add basic formatting
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n\n");
}

export async function POST(request: NextRequest) {
  try {
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
        // For .doc files, try to treat as text or provide helpful error
        return NextResponse.json(
          { error: "Classic .doc files are not fully supported. Please convert to .docx format first." },
          { status: 400 }
        );
      } else if (fileName.endsWith(".pdf")) {
        return NextResponse.json(
          { error: "PDF extraction requires client-side processing. Please paste the text content directly." },
          { status: 400 }
        );
      } else if (fileName.endsWith(".txt") || file.type === "text/plain") {
        markdown = await convertTextToMarkdown(buffer.toString("utf-8"));
      } else {
        // Try text parsing as fallback
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

    // Clean up the markdown
    markdown = markdown
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

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
