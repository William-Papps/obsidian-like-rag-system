import OpenAI from "openai";
import type { AiContext } from "@/lib/types";
import { dbGet } from "@/lib/db";
import { listTags, createTag, addNoteTag, getNoteTags } from "@/lib/services/tags";

function makeClient(ai: AiContext): OpenAI | null {
  if (ai.ollamaBaseUrl) return new OpenAI({ baseURL: `${ai.ollamaBaseUrl}/v1`, apiKey: "ollama" });
  if (ai.apiKey) return new OpenAI({ apiKey: ai.apiKey });
  return null;
}

// Suggest and apply tags to an untagged note. Skips notes that already have tags
// so manual curation is never overwritten.
export async function autoTagNote(
  userId: string,
  noteId: string,
  noteTitle: string,
  noteContent: string,
  ai: AiContext
): Promise<string[]> {
  const client = makeClient(ai);
  if (!client) return [];

  const existingNoteTags = await getNoteTags(noteId);
  if (existingNoteTags.length > 0) return [];

  const userTags = await listTags(userId);
  const tagHint = userTags.length
    ? `Prefer these existing tags where they fit (use exact names): ${userTags.map((t) => t.name).join(", ")}\n`
    : "";

  const content = `# ${noteTitle}\n\n${noteContent}`.slice(0, 2000);

  const response = await client.chat.completions.create({
    model: ai.settings.answerModel,
    max_tokens: 64,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "You suggest concise, lowercase tags for a study note. " +
          "Return ONLY a comma-separated list of 3-5 short tags, nothing else. " +
          "Example output: databases, sql, constraints\n" +
          tagHint
      },
      { role: "user", content }
    ]
  });

  const raw = response.choices[0]?.message?.content?.trim() ?? "";
  const suggested = raw
    .replace(/^\[|\]$/g, "")
    .split(/,|\n/)
    .map((t) => t.trim().toLowerCase().replace(/^[-•*"']+\s*/, "").replace(/["']+$/, ""))
    .filter((t) => t.length > 1 && t.length <= 30 && /^[a-z0-9]/.test(t))
    .slice(0, 5);

  if (!suggested.length) return [];

  const applied: string[] = [];
  for (const name of suggested) {
    let tag = userTags.find((t) => t.name.toLowerCase() === name);
    if (!tag) {
      try {
        tag = await createTag(userId, name);
      } catch {
        const row = await dbGet<{ id: string; name: string; color: string; created_at: string; updated_at: string }>(
          "select * from tags where user_id = ? and lower(name) = lower(?)",
          [userId, name]
        );
        if (!row) continue;
        tag = { id: row.id, userId, name: row.name, color: row.color, createdAt: row.created_at, updatedAt: row.updated_at };
      }
    }
    await addNoteTag(noteId, tag.id, userId);
    applied.push(tag.name);
  }

  return applied;
}
