import OpenAI from "openai";
import type { AiContext } from "@/lib/types";

const localDimensions = 192;

export async function embedText(
  userId: string,
  text: string,
  model: string,
  context?: AiContext
): Promise<{ vector: number[]; provider: "openai" | "local" }> {
  const apiKey = context?.apiKey ?? null;
  if (!apiKey) return { vector: localEmbedding(text), provider: "local" };

  const client = new OpenAI({ apiKey, project: context?.projectId || undefined });
  const response = await client.embeddings.create({ model, input: text });
  return { vector: response.data[0].embedding, provider: "openai" };
}

export function localEmbedding(text: string) {
  const vector = Array.from({ length: localDimensions }, () => 0);
  const terms = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  for (const term of terms) {
    let hash = 0;
    for (let i = 0; i < term.length; i += 1) hash = (hash * 31 + term.charCodeAt(i)) >>> 0;
    vector[hash % localDimensions] += 1;
  }
  return normalize(vector);
}

export function cosine(a: number[], b: number[]) {
  const length = Math.min(a.length, b.length);
  let dot = 0;
  let aa = 0;
  let bb = 0;
  for (let i = 0; i < length; i += 1) {
    dot += a[i] * b[i];
    aa += a[i] * a[i];
    bb += b[i] * b[i];
  }
  return aa && bb ? dot / (Math.sqrt(aa) * Math.sqrt(bb)) : 0;
}

function normalize(vector: number[]) {
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  return magnitude ? vector.map((value) => value / magnitude) : vector;
}
