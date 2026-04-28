import OpenAI from "openai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthenticatedUser } from "@/lib/auth";
import { QuotaExceededError, resolveAiContext } from "@/lib/services/ai-access";

export const dynamic = "force-dynamic";

const schema = z.object({
  markdown: z.string().min(1).max(200000)
});

export async function POST(request: Request) {
  return withAuthenticatedUser(async (user) => {
    try {
      const body = schema.parse(await request.json());
      const ai = await resolveAiContext(user.id, "summary");
      const fallback = formatMarkdownHeuristically(body.markdown);

      if (!ai.apiKey) {
        return NextResponse.json({ markdown: fallback, mode: "local" });
      }

      const client = new OpenAI({ apiKey: ai.apiKey, project: ai.projectId || undefined });
      const response = await client.chat.completions.create({
        model: ai.settings.answerModel,
        temperature: 0.1,
        messages: [
          {
            role: "system",
            content:
              "You clean and format Markdown notes. Preserve the original meaning and facts. Do not add outside knowledge. Keep headings, lists, code blocks, tables, and quotes valid Markdown. Improve spacing, structure, and readability only. Return only the formatted Markdown."
          },
          {
            role: "user",
            content: body.markdown
          }
        ]
      });

      const markdown = response.choices[0]?.message.content?.trim() || fallback;
      return NextResponse.json({ markdown, mode: "ai" });
    } catch (error) {
      if (error instanceof QuotaExceededError) {
        return NextResponse.json({ error: error.message }, { status: 402 });
      }
      return NextResponse.json({ error: error instanceof Error ? error.message : "Formatting failed" }, { status: 400 });
    }
  });
}

function formatMarkdownHeuristically(markdown: string) {
  return markdown
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{4,}/g, "\n\n\n")
    .replace(/^(#{1,6})([^ #\n])/gm, "$1 $2")
    .replace(/^(\s*[-*+])([^\s])/gm, "$1 $2")
    .replace(/^(\s*\d+\.)\s*([^\s])/gm, "$1 $2")
    .replace(/^(>)([^\s>])/gm, "$1 $2")
    .trim();
}
