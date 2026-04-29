"use client";

import { useState, useMemo, useCallback } from "react";
import { clsx } from "clsx";
import { AlertCircle, Check, Copy, FileJson, Maximize2, Minimize2 } from "lucide-react";

const DEFAULT_JSON = `{
  "name": "EternalNotes",
  "version": "1.0.0",
  "features": ["notes", "ai-chat", "regex", "json"],
  "settings": {
    "darkMode": true,
    "autoSave": true,
    "syncEnabled": false
  },
  "stats": {
    "notes": 42,
    "words": 18500
  }
}`;

type Token =
  | { kind: "key"; text: string }
  | { kind: "string"; text: string }
  | { kind: "number"; text: string }
  | { kind: "bool"; text: string }
  | { kind: "null"; text: string }
  | { kind: "punct"; text: string }
  | { kind: "ws"; text: string };

function tokenize(json: string): Token[] {
  const tokens: Token[] = [];
  const re =
    /"(\\.|[^"\\])*"(?=\s*:)|"(\\.|[^"\\])*"|\b(true|false)\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|[{}[\],:]|[ \t]+|\n/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(json)) !== null) {
    const t = m[0];
    if (/"[^"]*"(?=\s*:)/.test(t)) tokens.push({ kind: "key", text: t });
    else if (/^"/.test(t)) tokens.push({ kind: "string", text: t });
    else if (t === "true" || t === "false") tokens.push({ kind: "bool", text: t });
    else if (t === "null") tokens.push({ kind: "null", text: t });
    else if (/^-?\d/.test(t)) tokens.push({ kind: "number", text: t });
    else if (/^[ \t\n]/.test(t)) tokens.push({ kind: "ws", text: t });
    else tokens.push({ kind: "punct", text: t });
  }
  return tokens;
}

const TOKEN_CLASS: Record<Token["kind"], string> = {
  key: "text-blue-400",
  string: "text-success-400",
  number: "text-danger-400",
  bool: "text-amber-400",
  null: "text-ink-600",
  punct: "text-ink-400",
  ws: "",
};

export default function JsonPage() {
  const [raw, setRaw] = useState(DEFAULT_JSON);
  const [indent, setIndent] = useState(2);
  const [copied, setCopied] = useState(false);

  const { formatted, error } = useMemo(() => {
    if (!raw.trim()) return { formatted: "", error: null };
    try {
      return { formatted: JSON.stringify(JSON.parse(raw), null, indent), error: null };
    } catch (e) {
      return { formatted: "", error: (e as Error).message };
    }
  }, [raw, indent]);

  const tokens = useMemo(() => (formatted ? tokenize(formatted) : []), [formatted]);

  const copy = useCallback(() => {
    if (!formatted) return;
    navigator.clipboard.writeText(formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [formatted]);

  const minify = useCallback(() => {
    try {
      setRaw(JSON.stringify(JSON.parse(raw)));
    } catch {}
  }, [raw]);

  const prettify = useCallback(() => {
    try {
      setRaw(JSON.stringify(JSON.parse(raw), null, indent));
    } catch {}
  }, [raw, indent]);

  return (
    <div className="h-screen flex flex-col bg-ink-950 text-ink-100 overflow-hidden">
      {/* Header */}
      <div className="h-11 border-b border-ink-875 flex items-center gap-2 px-4 shrink-0">
        <FileJson className="w-4 h-4 text-accent-400 shrink-0" />
        <span className="text-sm font-semibold">JSON Tools</span>

        {error && (
          <span className="flex items-center gap-1.5 text-danger-400 text-xs ml-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </span>
        )}

        <div className="ml-auto flex items-center gap-1">
          <span className="text-xs text-ink-600 mr-1">Indent</span>
          {[2, 4].map((n) => (
            <button
              key={n}
              onClick={() => setIndent(n)}
              className={clsx(
                "px-2 py-0.5 rounded text-xs font-mono transition-colors",
                indent === n
                  ? "bg-accent-500/20 text-accent-300"
                  : "text-ink-600 hover:text-ink-300"
              )}
            >
              {n}
            </button>
          ))}

          <div className="w-px h-4 bg-ink-800 mx-2" />

          <button
            onClick={minify}
            className="flex items-center gap-1 text-xs text-ink-600 hover:text-ink-300 transition-colors px-2 py-1 rounded hover:bg-ink-875"
          >
            <Minimize2 className="w-3 h-3" /> Minify
          </button>
          <button
            onClick={prettify}
            className="flex items-center gap-1 text-xs text-ink-600 hover:text-ink-300 transition-colors px-2 py-1 rounded hover:bg-ink-875"
          >
            <Maximize2 className="w-3 h-3" /> Prettify
          </button>
          <button
            onClick={copy}
            disabled={!formatted}
            className="flex items-center gap-1 text-xs text-ink-300 hover:text-ink-100 transition-colors px-2 py-1 rounded hover:bg-ink-875 disabled:opacity-40"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-success-400" /> Copied
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" /> Copy
              </>
            )}
          </button>
        </div>
      </div>

      {/* Panels */}
      <div className="flex-1 overflow-hidden grid grid-cols-2 divide-x divide-ink-875">
        {/* Input */}
        <div className="flex flex-col p-4 gap-2 overflow-hidden">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-600 shrink-0">
            Input
          </p>
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            spellCheck={false}
            placeholder={'{"paste": "your JSON here"}'}
            className={clsx(
              "flex-1 resize-none rounded-lg border bg-ink-925 p-3 text-[13px] font-mono text-ink-200 placeholder:text-ink-700 outline-none transition-colors",
              error
                ? "border-danger-400/40"
                : "border-ink-800 focus:border-accent-500/60"
            )}
          />
        </div>

        {/* Output */}
        <div className="flex flex-col p-4 gap-2 overflow-hidden">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-600 shrink-0">
            Formatted
          </p>
          <div
            className={clsx(
              "flex-1 rounded-lg border bg-ink-925 p-3 overflow-auto",
              error ? "border-danger-400/20" : "border-ink-875"
            )}
          >
            {error ? (
              <p className="text-danger-400 text-sm">{error}</p>
            ) : formatted ? (
              <pre className="text-[13px] font-mono leading-6 whitespace-pre">
                {tokens.map((tok, i) => (
                  <span key={i} className={TOKEN_CLASS[tok.kind]}>
                    {tok.text}
                  </span>
                ))}
              </pre>
            ) : (
              <p className="text-ink-700 text-sm">Output appears here</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
