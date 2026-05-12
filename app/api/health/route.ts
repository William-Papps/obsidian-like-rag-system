import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const ollamaUrl = process.env.OLLAMA_BASE_URL?.replace(/\/$/, "");

  if (!ollamaUrl) {
    return NextResponse.json({ ollama_reachable: false, model_loaded: false, ready: false });
  }

  let ollamaReachable = false;
  let modelLoaded = false;

  try {
    const res = await fetch(`${ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      ollamaReachable = true;
      const data = (await res.json()) as { models?: { name: string }[] };
      const names = (data.models ?? []).map((m) => m.name);
      modelLoaded = names.some((n) => n === "nomic-embed-text" || n.startsWith("nomic-embed-text:"));
    }
  } catch {
    // unreachable
  }

  return NextResponse.json(
    { ollama_reachable: ollamaReachable, model_loaded: modelLoaded, ready: ollamaReachable && modelLoaded },
    { status: ollamaReachable && modelLoaded ? 200 : 503 }
  );
}
