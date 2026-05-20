import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { getCurrentUserOptional } from "@/lib/auth";
import { Workspace } from "@/components/workspace";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function checkOllamaReady(): Promise<boolean> {
  const ollamaUrl = process.env.OLLAMA_BASE_URL?.replace(/\/$/, "");
  if (!ollamaUrl) return true; // hosted mode — no Ollama needed
  try {
    const res = await fetch(`${ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(500) });
    if (!res.ok) return false;
    const data = (await res.json()) as { models?: { name: string }[] };
    return (data.models ?? []).some((m) => m.name === "nomic-embed-text" || m.name.startsWith("nomic-embed-text:"));
  } catch {
    return false;
  }
}

export default async function RootPage() {
  noStore();

  // During Docker first-run, show setup page while models download
  const ready = await checkOllamaReady();
  if (!ready) redirect("/setup");

  const user = await getCurrentUserOptional();
  if (user) return <Workspace />;
  redirect("/auth");
}

