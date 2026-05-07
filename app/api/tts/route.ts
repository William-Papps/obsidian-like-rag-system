import { NextResponse } from "next/server";
import { z } from "zod";
import OpenAI from "openai";
import { withAuthenticatedUser } from "@/lib/auth";
import { readHostedApiKey, readUserApiKey, hostedAiAvailable } from "@/lib/services/settings";

export const dynamic = "force-dynamic";

const schema = z.object({ text: z.string().min(1).max(500) });

export async function POST(request: Request) {
  return withAuthenticatedUser(async (user) => {
    const { text } = schema.parse(await request.json());

    // Prefer user's own key, fall back to hosted key — no quota consumed for TTS.
    let apiKey: string | null = readUserApiKey(user.id);
    if (!apiKey && (await hostedAiAvailable())) apiKey = readHostedApiKey();

    if (!apiKey) {
      return NextResponse.json({ error: "no_key" }, { status: 422 });
    }

    const openai = new OpenAI({ apiKey });
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: "nova",
      input: text,
      speed: 1.05
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "no-store"
      }
    });
  });
}
