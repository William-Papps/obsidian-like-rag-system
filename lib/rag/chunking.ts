import type { Note } from "@/lib/types";

const TARGET_CHARS = 1200;

export function chunkNote(note: Note) {
  const lines = note.markdownContent.split(/\r?\n/);
  const chunks: string[] = [];
  let currentHeading = `# ${note.title}`;
  let buffer = "";
  let inCodeBlock = false;
  let inTable = false;

  for (const line of lines) {
    const trimmed = line.trimStart();

    // Track fenced code blocks — never split inside one.
    if (trimmed.startsWith("```") || trimmed.startsWith("~~~")) {
      inCodeBlock = !inCodeBlock;
    }

    // Track table rows — a table is any sequence of lines beginning with |
    if (!inCodeBlock) {
      inTable = trimmed.startsWith("|");
    }

    if (!inCodeBlock && /^#{1,6}\s+/.test(line)) currentHeading = line;

    const next = `${buffer}${line}\n`;
    const overTarget = next.length > TARGET_CHARS && buffer.trim();

    // Only split at a safe boundary: not inside a code block, not mid-table.
    if (overTarget && !inCodeBlock && !inTable) {
      chunks.push(withContext(note.title, currentHeading, buffer));
      buffer = `${line}\n`;
    } else {
      buffer = next;
    }
  }

  if (buffer.trim()) chunks.push(withContext(note.title, currentHeading, buffer));
  return chunks.length ? chunks : [withContext(note.title, `# ${note.title}`, note.markdownContent)];
}

function withContext(title: string, heading: string, text: string) {
  return [`Note: ${title}`, `Section: ${heading.replace(/^#+\s*/, "")}`, "", text.trim()].join("\n");
}
