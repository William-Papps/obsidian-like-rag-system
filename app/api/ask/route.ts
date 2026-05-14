import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { enforceRateLimit, RateLimitError } from "@/lib/rate-limit";
import { streamAnswerFromNotes } from "@/lib/rag/answer";
import { resolveScopeTitle } from "@/lib/rag/retrieval";
import { recordStudyActivity } from "@/lib/services/study-history";

export const dynamic = "force-dynamic";

const schema = z.object({
  question: z.string().min(1),
  scope: z.object({ noteId: z.string().optional(), folderId: z.string().nullable().optional() }).optional()
});

export async function POST(request: Request) {
  let user;
  try {
    user = await getCurrentUser();
  } catch {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await request.json());
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400 });
  }

  const scope = body.scope ?? {};
  const userId = user.id;

  try {
    await enforceRateLimit(`ask:${userId}`, 30, 60_000);
  } catch (err) {
    if (err instanceof RateLimitError) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 429,
        headers: { "content-type": "application/json", "retry-after": String(Math.ceil(err.retryAfterMs / 1000)) }
      });
    }
    throw err;
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        await streamAnswerFromNotes(userId, body.question, scope, controller);
        await recordStudyActivity(userId, "ask", {
          scopeLabel: await resolveScopeTitle(userId, scope),
          noteTitle: null
        });
      } catch (err) {
        const enc = new TextEncoder();
        console.error("[ask] stream failed", err);
        const message = err instanceof Error ? err.message : "Ask request failed";
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ type: "error", data: message })}\n\n`));
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive"
    }
  });
}
