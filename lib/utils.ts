import { createHash, randomUUID } from "crypto";

export function id() {
  return randomUUID();
}

export function now() {
  return new Date().toISOString();
}

export function sha256(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

export function maskApiKey(key: string) {
  const trimmed = key.trim();
  if (trimmed.length < 12) return "••••";
  return `${trimmed.slice(0, 7)}…${trimmed.slice(-4)}`;
}

export function toCamelRecord<T extends Record<string, unknown>>(row: T) {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    output[key.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase())] = value;
  }
  return output;
}

export function truncate(input: string, max = 260) {
  const compact = input.replace(/\s+/g, " ").trim();
  return compact.length <= max ? compact : `${compact.slice(0, max - 1).trim()}…`;
}
