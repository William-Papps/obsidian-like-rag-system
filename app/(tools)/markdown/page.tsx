"use client";

import { useState } from "react";
import { FileText, Copy, Check, Eye, Edit3, Columns } from "lucide-react";
import { clsx } from "clsx";
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { MarkdownPreview } from "@/components/markdown";

type View = "write" | "preview" | "split";

const DEFAULT_MD = `# Welcome to Markdown Editor

A fast, distraction-free editor with live preview.

## Features

- **Bold**, *italic*, \`inline code\`
- [Links](https://example.com)
- Tables, task lists, code blocks

## Code Example

\`\`\`typescript
function greet(name: string) {
  return \`Hello, \${name}!\`;
}
\`\`\`

## Task List

- [x] Create notes workspace
- [x] Add AI Q&A panel
- [ ] Build regex tester
- [ ] Sync to cloud

> Use the split view to write and preview simultaneously.
`;

export default function MarkdownPage() {
  const [content, setContent] = useState(DEFAULT_MD);
  const [view, setView] = useState<View>("split");
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const views: { id: View; icon: React.ElementType; label: string }[] = [
    { id: "write", icon: Edit3, label: "Write" },
    { id: "split", icon: Columns, label: "Split" },
    { id: "preview", icon: Eye, label: "Preview" },
  ];

  return (
    <div className="h-screen flex flex-col bg-ink-950 text-ink-100 overflow-hidden">
      {/* Header */}
      <div className="h-11 border-b border-ink-875 flex items-center gap-3 px-4 shrink-0">
        <FileText className="w-4 h-4 text-accent-400 shrink-0" />
        <span className="text-sm font-semibold">Markdown Editor</span>
        <span className="text-xs text-ink-700">
          {content.length.toLocaleString()} chars
        </span>

        {/* View toggle */}
        <div className="ml-auto flex items-center gap-0.5 bg-ink-925 border border-ink-800 rounded-lg p-0.5">
          {views.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              title={label}
              className={clsx(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                view === id
                  ? "bg-ink-800 text-ink-100"
                  : "text-ink-600 hover:text-ink-300"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        <button
          onClick={copy}
          className="flex items-center gap-1 text-xs text-ink-600 hover:text-ink-300 transition-colors px-2 py-1 rounded hover:bg-ink-875 ml-1"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-success-400" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Editor */}
      <div
        className={clsx(
          "flex-1 overflow-hidden",
          view === "split" && "grid grid-cols-2 divide-x divide-ink-875"
        )}
      >
        {(view === "write" || view === "split") && (
          <div className="h-full overflow-auto bg-ink-925">
            <CodeMirror
              value={content}
              onChange={setContent}
              extensions={[markdown()]}
              theme="dark"
              basicSetup={{
                lineNumbers: false,
                foldGutter: false,
                highlightActiveLine: false,
              }}
              className="h-full text-[13px]"
              style={{ height: "100%" }}
            />
          </div>
        )}

        {(view === "preview" || view === "split") && (
          <div className="h-full overflow-auto p-6 lg:p-8 bg-ink-950">
            <div className="max-w-2xl mx-auto">
              <MarkdownPreview markdown={content} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
