const FILLER_PATTERNS = [
  /^(what is|what are|what was|what were)\s+/i,
  /^(how does|how do|how is|how are)\s+/i,
  /^(tell me about|explain|describe|define)\s+/i,
  /^(can you|could you|please|I want to know|I need to know)\s+/i,
  /^(give me|show me|list)\s+/i
];

const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "can", "of", "in", "on", "at", "to", "for",
  "with", "by", "from", "that", "this", "these", "those", "it", "its",
  "my", "your", "our", "their", "and", "or", "but", "if", "how", "what",
  "when", "where", "why", "who", "which", "about", "more", "some", "any"
]);

export function rewriteQueryRuleBased(query: string): string {
  let q = query.trim().toLowerCase().replace(/[?.!]+$/, "").trim();
  for (const pattern of FILLER_PATTERNS) q = q.replace(pattern, "");
  q = q.replace(/\s+/g, " ").trim();
  return q || query.toLowerCase().trim();
}

export function extractKeywords(query: string): string {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
    .join(" ");
}

export function dedupeStrings(strs: string[]): string[] {
  const seen = new Set<string>();
  return strs.filter((s) => s.trim() && !seen.has(s.trim()) && seen.add(s.trim()));
}
