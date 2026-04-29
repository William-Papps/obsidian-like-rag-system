"use client";

import { useState, useMemo } from "react";
import { clsx } from "clsx";
import { AlertCircle, Hash, RotateCcw } from "lucide-react";

type Flag = "g" | "i" | "m" | "s" | "u";

const FLAGS: { flag: Flag; title: string }[] = [
  { flag: "g", title: "Global — find all matches" },
  { flag: "i", title: "Case insensitive" },
  { flag: "m", title: "Multiline — ^ and $ match line breaks" },
  { flag: "s", title: "Dot all — . matches newlines" },
  { flag: "u", title: "Unicode mode" },
];

const QUICK_REF = [
  { token: ".", desc: "Any character except newline" },
  { token: "\\d", desc: "Digit [0–9]" },
  { token: "\\D", desc: "Non-digit" },
  { token: "\\w", desc: "Word char [a-zA-Z0-9_]" },
  { token: "\\W", desc: "Non-word character" },
  { token: "\\s", desc: "Whitespace" },
  { token: "\\S", desc: "Non-whitespace" },
  { token: "\\b", desc: "Word boundary" },
  { token: "\\B", desc: "Non-word boundary" },
  { token: "^", desc: "Start of line" },
  { token: "$", desc: "End of line" },
  { token: "*", desc: "0 or more (greedy)" },
  { token: "+", desc: "1 or more (greedy)" },
  { token: "?", desc: "0 or 1 / makes quantifier lazy" },
  { token: "{n}", desc: "Exactly n repetitions" },
  { token: "{n,m}", desc: "Between n and m repetitions" },
  { token: "(abc)", desc: "Capture group" },
  { token: "(?:abc)", desc: "Non-capture group" },
  { token: "(?=abc)", desc: "Positive lookahead" },
  { token: "(?!abc)", desc: "Negative lookahead" },
  { token: "(?<=abc)", desc: "Positive lookbehind" },
  { token: "(?<!abc)", desc: "Negative lookbehind" },
  { token: "[abc]", desc: "Character class" },
  { token: "[^abc]", desc: "Negated character class" },
  { token: "a|b", desc: "Alternation — a or b" },
  { token: "\\1", desc: "Backreference to group 1" },
];

type Match = {
  text: string;
  index: number;
  groups: (string | undefined)[];
};

function runRegex(
  pattern: string,
  flagSet: Set<Flag>,
  input: string
): { matches: Match[]; error: string | null } {
  if (!pattern) return { matches: [], error: null };
  try {
    const flagStr = [...flagSet].sort().join("");
    // Always use 'g' internally so exec loops; if user didn't pick 'g' we stop after first
    const flags = flagSet.has("g") ? flagStr : flagStr + "g";
    const re = new RegExp(pattern, flags);
    const out: Match[] = [];
    let m: RegExpExecArray | null;
    let guard = 0;
    while ((m = re.exec(input)) !== null && guard++ < 2000) {
      out.push({ text: m[0], index: m.index, groups: m.slice(1) });
      if (m[0].length === 0) re.lastIndex++;
      if (!flagSet.has("g")) break;
    }
    return { matches: out, error: null };
  } catch (e) {
    return { matches: [], error: (e as Error).message };
  }
}

type Segment = { text: string; highlight: boolean };

function buildSegments(input: string, matches: Match[]): Segment[] {
  const segs: Segment[] = [];
  let pos = 0;
  for (const m of matches) {
    if (m.index > pos) segs.push({ text: input.slice(pos, m.index), highlight: false });
    segs.push({ text: m.text, highlight: true });
    pos = m.index + m.text.length;
  }
  if (pos < input.length) segs.push({ text: input.slice(pos), highlight: false });
  return segs;
}

const DEFAULT_INPUT =
  "The quick brown fox\njumps over the lazy dog.\nfoo@bar.com — test 123\n2024-01-15";

export default function RegexPage() {
  const [pattern, setPattern] = useState("");
  const [flags, setFlags] = useState<Set<Flag>>(new Set(["g"]));
  const [input, setInput] = useState(DEFAULT_INPUT);
  const [replacement, setReplacement] = useState("");
  const [tab, setTab] = useState<"matches" | "substitute" | "reference">("matches");

  const { matches, error } = useMemo(
    () => runRegex(pattern, flags, input),
    [pattern, flags, input]
  );

  const segments = useMemo(
    () => (pattern && !error && matches.length > 0 ? buildSegments(input, matches) : null),
    [input, matches, pattern, error]
  );

  const substituted = useMemo(() => {
    if (!pattern || error) return input;
    try {
      const fs = [...flags].sort().join("");
      return input.replace(new RegExp(pattern, fs), replacement);
    } catch {
      return input;
    }
  }, [pattern, flags, input, replacement, error]);

  function toggleFlag(f: Flag) {
    setFlags((prev) => {
      const next = new Set(prev);
      next.has(f) ? next.delete(f) : next.add(f);
      return next;
    });
  }

  return (
    <div className="h-screen flex flex-col bg-ink-950 text-ink-100 overflow-hidden">
      {/* Header */}
      <div className="h-11 border-b border-ink-875 flex items-center gap-3 px-4 shrink-0">
        <Hash className="w-4 h-4 text-accent-400 shrink-0" />
        <span className="text-sm font-semibold">Regex Tester</span>
        {!error && matches.length > 0 && (
          <span className="px-2 py-0.5 bg-accent-500/20 text-accent-300 text-xs rounded-full font-medium">
            {matches.length} match{matches.length !== 1 ? "es" : ""}
          </span>
        )}
        {error && (
          <span className="flex items-center gap-1.5 text-danger-400 text-xs">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </span>
        )}
        <button
          onClick={() => {
            setPattern("");
            setInput(DEFAULT_INPUT);
            setReplacement("");
          }}
          title="Reset"
          className="ml-auto text-ink-700 hover:text-ink-400 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden grid grid-cols-[1fr_360px] divide-x divide-ink-875">
        {/* Left: inputs */}
        <div className="flex flex-col divide-y divide-ink-875 overflow-hidden">
          {/* Pattern + flags */}
          <div className="p-4 shrink-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-600 mb-2">
              Expression
            </p>
            <div
              className={clsx(
                "flex items-center rounded-lg border bg-ink-925 transition-colors",
                error
                  ? "border-danger-400/50"
                  : "border-ink-800 focus-within:border-accent-500/60"
              )}
            >
              <span className="px-3 py-2.5 text-ink-600 font-mono text-base select-none">/</span>
              <input
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                placeholder="your pattern here"
                spellCheck={false}
                className="flex-1 bg-transparent py-2.5 text-[13px] font-mono text-ink-100 placeholder:text-ink-700 outline-none"
              />
              <span className="px-1 text-ink-600 font-mono text-base select-none">/</span>
              <div className="flex items-center gap-0.5 px-2">
                {FLAGS.map(({ flag, title }) => (
                  <button
                    key={flag}
                    onClick={() => toggleFlag(flag)}
                    title={title}
                    className={clsx(
                      "w-6 h-6 rounded text-xs font-mono font-bold transition-colors",
                      flags.has(flag)
                        ? "bg-accent-500/25 text-accent-300"
                        : "text-ink-700 hover:text-ink-400"
                    )}
                  >
                    {flag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Test string */}
          <div className="flex-1 flex flex-col p-4 gap-2 min-h-0 overflow-hidden">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-600 shrink-0">
              Test String
            </p>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              spellCheck={false}
              className="flex-1 resize-none rounded-lg border border-ink-800 bg-ink-925 p-3 text-[13px] font-mono text-ink-200 placeholder:text-ink-700 outline-none focus:border-accent-500/60 transition-colors"
            />
          </div>
        </div>

        {/* Right: results */}
        <div className="flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-ink-875 shrink-0">
            {(
              [
                { id: "matches", label: "Matches" },
                { id: "substitute", label: "Substitution" },
                { id: "reference", label: "Reference" },
              ] as const
            ).map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={clsx(
                  "px-4 py-2.5 text-xs font-semibold transition-colors border-b-2 -mb-px",
                  tab === id
                    ? "text-accent-400 border-accent-500"
                    : "text-ink-600 border-transparent hover:text-ink-300"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Matches tab */}
            {tab === "matches" && (
              <div className="p-3 space-y-2">
                {/* Highlighted preview */}
                {segments && (
                  <div className="rounded-lg border border-ink-875 bg-ink-925 p-3 mb-1">
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-ink-700 mb-2">
                      Preview
                    </p>
                    <pre className="text-[13px] font-mono text-ink-300 whitespace-pre-wrap break-words leading-6">
                      {segments.map((seg, i) =>
                        seg.highlight ? (
                          <mark
                            key={i}
                            className="bg-accent-500/30 text-accent-200 rounded-[2px] not-italic"
                          >
                            {seg.text}
                          </mark>
                        ) : (
                          <span key={i}>{seg.text}</span>
                        )
                      )}
                    </pre>
                  </div>
                )}

                {!error && matches.length === 0 && (
                  <div className="py-10 text-center text-ink-700 text-sm">
                    {pattern ? "No matches found" : "Enter a pattern above"}
                  </div>
                )}

                {matches.map((m, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-ink-875 bg-ink-925 p-3"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-bold text-ink-600 uppercase tracking-widest">
                        Match {i + 1}
                      </span>
                      <span className="text-[10px] text-ink-700">
                        index {m.index}–{m.index + m.text.length}
                      </span>
                    </div>
                    <code className="block text-sm text-accent-300 bg-accent-500/10 px-2 py-1 rounded font-mono mb-2">
                      {m.text === "" ? "(empty string)" : m.text}
                    </code>
                    {m.groups.length > 0 && (
                      <div className="space-y-1 mt-1">
                        {m.groups.map((g, gi) => (
                          <div key={gi} className="flex items-center gap-2 text-xs">
                            <span className="text-ink-700">Group {gi + 1}</span>
                            <code className="text-ink-400 font-mono">
                              {g === undefined ? "(undefined)" : g === "" ? "(empty)" : g}
                            </code>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Substitute tab */}
            {tab === "substitute" && (
              <div className="p-4 space-y-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-600 mb-2">
                    Replace with{" "}
                    <span className="text-ink-700 normal-case font-normal">
                      ($1, $2 for capture groups)
                    </span>
                  </p>
                  <input
                    value={replacement}
                    onChange={(e) => setReplacement(e.target.value)}
                    placeholder="$1 replacement text"
                    className="w-full bg-ink-925 border border-ink-800 rounded-lg px-3 py-2 text-[13px] font-mono text-ink-200 placeholder:text-ink-700 outline-none focus:border-accent-500/60 transition-colors"
                  />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-600 mb-2">
                    Result
                  </p>
                  <pre className="text-[13px] font-mono text-ink-200 bg-ink-925 border border-ink-875 rounded-lg p-3 whitespace-pre-wrap break-words leading-6 min-h-[120px]">
                    {substituted}
                  </pre>
                </div>
              </div>
            )}

            {/* Reference tab */}
            {tab === "reference" && (
              <div className="p-2">
                {QUICK_REF.map(({ token, desc }) => (
                  <button
                    key={token}
                    onClick={() => setPattern((p) => p + token)}
                    title="Click to append to pattern"
                    className="w-full flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-ink-875 text-left group transition-colors"
                  >
                    <code className="text-xs font-mono text-accent-300 w-[100px] shrink-0">
                      {token}
                    </code>
                    <span className="text-xs text-ink-600 group-hover:text-ink-300 transition-colors">
                      {desc}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
