import { NextResponse } from "next/server";
import OpenAI from "openai";
import { withAuthenticatedUser } from "@/lib/auth";
import { getNote } from "@/lib/services/notes";
import { listTags } from "@/lib/services/tags";
import { resolveAiContext } from "@/lib/services/ai-access";
import type { AiContext } from "@/lib/types";

export const dynamic = "force-dynamic";

function makeClient(ai: AiContext): OpenAI | null {
  if (ai.ollamaBaseUrl) return new OpenAI({ baseURL: `${ai.ollamaBaseUrl}/v1`, apiKey: "ollama" });
  if (ai.apiKey) return new OpenAI({ apiKey: ai.apiKey });
  return null;
}

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuthenticatedUser(async (user) => {
    try {
      const { id } = await params;
      const [note, existingTags, ai] = await Promise.all([
        getNote(user.id, id),
        listTags(user.id),
        resolveAiContext(user.id, "ask")
      ]);

      if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const client = makeClient(ai);
      if (!client) return NextResponse.json({ error: "AI not configured" }, { status: 402 });

      const content = `# ${note.title}\n\n${note.markdownContent}`.slice(0, 2000);
      const tagHint = existingTags.length
        ? `Prefer these existing tags where they fit (use exact names): ${existingTags.map((t) => t.name).join(", ")}\n`
        : "";

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

      return NextResponse.json({ suggested, existingTags });
    } catch {
      return NextResponse.json({ error: "Failed to suggest tags" }, { status: 500 });
    }
  });
}
