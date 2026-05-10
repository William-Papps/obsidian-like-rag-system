import { NextResponse } from "next/server";
import OpenAI from "openai";
import { withAuthenticatedUser } from "@/lib/auth";
import { getNote } from "@/lib/services/notes";
import { listTags } from "@/lib/services/tags";
import { resolveAiContext } from "@/lib/services/ai-access";

export const dynamic = "force-dynamic";

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
      if (!ai.apiKey) return NextResponse.json({ error: "AI not configured" }, { status: 402 });

      const content = `# ${note.title}\n\n${note.markdownContent}`.slice(0, 3000);
      const tagList = existingTags.map((t) => t.name).join(", ");

      const client = new OpenAI({ apiKey: ai.apiKey });
      const response = await client.chat.completions.create({
        model: ai.settings.answerModel,
        max_tokens: 128,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "You suggest concise, lowercase tags for a note. " +
              "Return ONLY a valid JSON array of 3-5 short tag strings, nothing else. " +
              (tagList ? `Prefer these existing tags where they fit (use exact names): ${tagList}` : "")
          },
          { role: "user", content }
        ]
      });

      const text = response.choices[0]?.message?.content?.trim() ?? "[]";
      const match = text.match(/\[[\s\S]*\]/);
      const suggested: string[] = match ? (JSON.parse(match[0]) as string[]).slice(0, 5) : [];

      return NextResponse.json({ suggested, existingTags });
    } catch (error) {
      return NextResponse.json({ error: "Failed to suggest tags" }, { status: 500 });
    }
  });
}
