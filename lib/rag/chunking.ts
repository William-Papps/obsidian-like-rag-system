import type { Note } from "@/lib/types";

const targetChars = 1200;

export function chunkNote(note: Note) {
  const lines = note.markdownContent.split(/\r?\n/);
  const chunks: string[] = [];
  let currentHeading = `# ${note.title}`;
  let buffer = "";

  for (const line of lines) {
    if (/^#{1,6}\s+/.test(line)) currentHeading = line;
    const next = `${buffer}${line}\n`;
    if (next.length > targetChars && buffer.trim()) {
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
