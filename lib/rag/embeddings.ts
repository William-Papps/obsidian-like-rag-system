import OpenAI from "openai";
import type { AiContext } from "@/lib/types";

const LOCAL_DIMS = 256;

function makeEmbedClient(context?: AiContext): OpenAI | null {
  if (context?.ollamaBaseUrl) {
    return new OpenAI({ baseURL: `${context.ollamaBaseUrl}/v1`, apiKey: "ollama" });
  }
  return context?.apiKey ? new OpenAI({ apiKey: context.apiKey }) : null;
}

export async function embedText(
  userId: string,
  text: string,
  model: string,
  context?: AiContext
): Promise<{ vector: number[]; provider: "openai" | "ollama" | "local" }> {
  const client = makeEmbedClient(context);
  if (!client) return { vector: localEmbedding(text), provider: "local" };
  const response = await client.embeddings.create({ model, input: text });
  return { vector: response.data[0].embedding, provider: context?.ollamaBaseUrl ? "ollama" : "openai" };
}

// Single OpenAI call for all chunks in a note instead of N sequential calls.
export async function embedBatch(
  userId: string,
  texts: string[],
  model: string,
  context?: AiContext
): Promise<Array<{ vector: number[]; provider: "openai" | "ollama" | "local" }>> {
  if (texts.length === 0) return [];
  const client = makeEmbedClient(context);
  if (!client) {
    return texts.map((text) => ({ vector: localEmbedding(text), provider: "local" as const }));
  }
  const response = await client.embeddings.create({ model, input: texts });
  const provider = context?.ollamaBaseUrl ? ("ollama" as const) : ("openai" as const);
  return response.data.map((item) => ({ vector: item.embedding, provider }));
}

export function localEmbedding(text: string): number[] {
  const vector = new Array<number>(LOCAL_DIMS).fill(0);
  const terms = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2);

  for (const term of terms) {
    vector[fnv1a(term) % LOCAL_DIMS] += 1.0;
  }

  // Bigrams provide positional context that unigrams alone miss.
  for (let i = 0; i < terms.length - 1; i++) {
    vector[fnv1a(`${terms[i]}_${terms[i + 1]}`) % LOCAL_DIMS] += 0.6;
  }

  return normalize(vector);
}

// FNV-1a: better avalanche effect and distribution than the previous rolling polynomial hash.
function fnv1a(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash;
}

export function cosine(a: number[], b: number[]) {
  const length = Math.min(a.length, b.length);
  let dot = 0;
  let aa = 0;
  let bb = 0;
  for (let i = 0; i < length; i++) {
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
