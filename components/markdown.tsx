"use client";

import { useEffect, useRef } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import hljs from "highlight.js/lib/common";
import "highlight.js/styles/github-dark.css";

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c] ?? c));
}

function safeHref(href: string) {
  try {
    const url = new URL(href, "https://example.com");
    return url.protocol === "http:" || url.protocol === "https:" || url.protocol === "mailto:" ? href : "#";
  } catch {
    return "#";
  }
}

function renderMath(tex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(tex, { displayMode, throwOnError: false, output: "html" });
  } catch {
    return escapeHtml(tex);
  }
}

function inline(raw: string, onWikilink?: (title: string) => void): string {
  // Extract inline math $...$ before HTML-escaping so TeX isn't mangled.
  const mathParts: string[] = [];
  const withMathPlaceholders = raw.replace(/\$(?!\$)([^$\n]+?)\$/g, (_, tex) => {
    const idx = mathParts.length;
    mathParts.push(tex);
    return `\x00M${idx}\x00`;
  });

  let html = escapeHtml(withMathPlaceholders)
    // images: ![alt](/_img/id) or external
    .replace(/!\[([^\]]*)\]\((\/_img\/[^)]+)\)/g, (_, alt, src) =>
      `<img src="/api/images/${src.replace("/_img/", "")}" alt="${alt}" class="md-img" loading="lazy" />`
    )
    .replace(/!\[([^\]]*)\]\((\/api\/images\/[^)]+)\)/g, (_, alt, src) =>
      `<img src="${src}" alt="${escapeHtml(alt)}" class="md-img" loading="lazy" />`
    )
    .replace(/!\[([^\]]*)\]\((data:image\/[^)]+)\)/g, (_, alt, src) =>
      `<img src="${src}" alt="${escapeHtml(alt)}" class="md-img" loading="lazy" />`
    )
    .replace(/!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g, (_, alt, src) =>
      `<img src="${safeHref(src)}" alt="${escapeHtml(alt)}" class="md-img" loading="lazy" />`
    )
    // links
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, (_, text, href) =>
      `<a href="${safeHref(href)}" target="_blank" rel="noopener noreferrer" class="md-link">${text}</a>`
    )
    // wikilinks [[Note Title]]
    .replace(/\[\[([^\]]+)\]\]/g, (_, title) => {
      onWikilink?.(title);
      return `<a class="md-wikilink" data-title="${escapeHtml(title)}">${escapeHtml(title)}</a>`;
    })
    // inline formatting
    .replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/~~([^~]+)~~/g, "<del>$1</del>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");

  // Restore inline math placeholders as KaTeX HTML
  if (mathParts.length > 0) {
    html = html.replace(/\x00M(\d+)\x00/g, (_, idx) => renderMath(mathParts[parseInt(idx)], false));
  }

  return html;
}

function parseTable(tableLines: string[]): string {
  const rows = tableLines.map((line) =>
    line
      .replace(/^\||\|$/g, "")
      .split("|")
      .map((cell) => cell.trim())
  );
  if (rows.length < 2) return rows.map((row) => `<p>${row.join(" | ")}</p>`).join("");

  const header = rows[0];
  const body = rows.slice(2); // skip separator row

  const th = header.map((cell) => `<th>${inline(cell)}</th>`).join("");
  const tb = body
    .map((row) => {
      const cells = header.map((_, i) => `<td>${inline(row[i] ?? "")}</td>`).join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  return `<div class="md-table-wrap"><table><thead><tr>${th}</tr></thead><tbody>${tb}</tbody></table></div>`;
}

export function renderMarkdown(markdown: string, onWikilink?: (title: string) => void): string {
  const lines = markdown.split(/\r?\n/);
  const blocks: string[] = [];
  let list: string[] = [];
  let orderedList: string[] = [];
  let quote: string[] = [];
  let code: string[] = [];
  let codeLang = "";
  let inCode = false;
  let tableLines: string[] = [];
  let displayMath: string[] = [];
  let inDisplayMath = false;

  const flushList = () => {
    if (list.length) {
      blocks.push(`<ul>${list.map((item) => `<li>${inline(item, onWikilink)}</li>`).join("")}</ul>`);
      list = [];
    }
    if (orderedList.length) {
      blocks.push(`<ol>${orderedList.map((item) => `<li>${inline(item, onWikilink)}</li>`).join("")}</ol>`);
      orderedList = [];
    }
  };
  const flushQuote = () => {
    if (quote.length) {
      const callout = /^\[!(\w+)\]\s*(.*)$/.exec(quote[0]?.trim() ?? "");
      if (callout) {
        const kind = (callout[1] ?? "note").toLowerCase();
        const title = (callout[2] ?? "").trim() || kind.toUpperCase();
        const body = quote.slice(1);
        blocks.push(
          `<div class="md-callout md-callout-${escapeHtml(kind)}">` +
            `<div class="md-callout-title">${inline(title, onWikilink)}</div>` +
            `<div class="md-callout-body">${body.map((item) => `<p>${inline(item, onWikilink)}</p>`).join("")}</div>` +
          `</div>`
        );
      } else {
        blocks.push(`<blockquote>${quote.map((item) => `<p>${inline(item, onWikilink)}</p>`).join("")}</blockquote>`);
      }
      quote = [];
    }
  };
  const flushCode = () => {
    if (code.length) {
      const langAttr = codeLang ? ` class="language-${escapeHtml(codeLang)}"` : "";
      const langLabel = codeLang ? escapeHtml(codeLang) : "code";
      blocks.push(
        `<div class="md-code-wrap" data-md-code="1">` +
          `<div class="md-code-head">` +
            `<span class="md-code-lang">${langLabel}</span>` +
            `<button type="button" class="md-code-copy" data-md-code-copy="1">Copy</button>` +
          `</div>` +
          `<pre><code${langAttr}>${escapeHtml(code.join("\n"))}</code></pre>` +
        `</div>`
      );
      code = [];
      codeLang = "";
    }
  };
  const flushTable = () => {
    if (tableLines.length) {
      blocks.push(parseTable(tableLines));
      tableLines = [];
    }
  };
  const flushDisplayMath = () => {
    if (displayMath.length) {
      blocks.push(`<div class="md-math-display">${renderMath(displayMath.join("\n"), true)}</div>`);
      displayMath = [];
    }
  };

  for (const line of lines) {
    // Display math $$...$$
    if (line.trim() === "$$") {
      if (inDisplayMath) { flushDisplayMath(); }
      else { flushList(); flushQuote(); flushTable(); }
      inDisplayMath = !inDisplayMath;
      continue;
    }
    if (inDisplayMath) { displayMath.push(line); continue; }

    if (line.startsWith("```")) {
      if (inCode) { flushCode(); }
      else { flushList(); flushQuote(); flushTable(); codeLang = line.slice(3).trim(); }
      inCode = !inCode;
      continue;
    }
    if (inCode) { code.push(line); continue; }

    // table row
    if (/^\|.+\|/.test(line)) {
      flushList(); flushQuote();
      tableLines.push(line);
      continue;
    }
    if (tableLines.length && !/^\|/.test(line)) flushTable();

    if (!line.trim()) { flushList(); flushQuote(); continue; }

    const blockquote = /^>\s?(.*)$/.exec(line);
    if (blockquote) { flushList(); flushTable(); quote.push(blockquote[1]); continue; }

    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) {
      flushList(); flushQuote(); flushTable();
      const level = heading[1].length;
      const anchor = heading[2].toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
      blocks.push(`<h${level} id="${anchor}">${inline(heading[2], onWikilink)}</h${level}>`);
      continue;
    }

    const hr = /^(-{3,}|\*{3,}|_{3,})$/.exec(line.trim());
    if (hr) { flushList(); flushQuote(); flushTable(); blocks.push("<hr />"); continue; }

    const listItem = /^[-*+]\s+(.+)$/.exec(line);
    if (listItem) { flushQuote(); flushTable(); list.push(listItem[1]); continue; }

    const orderedItem = /^\d+\.\s+(.+)$/.exec(line);
    if (orderedItem) { flushQuote(); flushTable(); orderedList.push(orderedItem[1]); continue; }

    flushList(); flushQuote(); flushTable();
    blocks.push(`<p>${inline(line, onWikilink)}</p>`);
  }

  flushList(); flushQuote(); flushCode(); flushTable(); flushDisplayMath();
  return blocks.join("");
}

export function MarkdownPreview({
  markdown,
  onWikilinkClick
}: {
  markdown: string;
  onWikilinkClick?: (title: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const html = renderMarkdown(markdown);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.querySelectorAll<HTMLElement>("pre code[class*='language-']").forEach((block) => {
      if (!block.dataset.highlighted) hljs.highlightElement(block);
    });
  }, [html]);

  function handleClick(event: React.MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    const copyBtn = target.closest("[data-md-code-copy]") as HTMLElement | null;
    if (copyBtn) {
      const wrap = copyBtn.closest("[data-md-code]") as HTMLElement | null;
      const codeEl = wrap?.querySelector("pre > code") as HTMLElement | null;
      const text = codeEl?.textContent ?? "";
      void navigator.clipboard.writeText(text);
      (copyBtn as HTMLButtonElement).textContent = "Copied";
      window.setTimeout(() => {
        (copyBtn as HTMLButtonElement).textContent = "Copy";
      }, 900);
      return;
    }
    const wikilink = target.closest("[data-title]") as HTMLElement | null;
    if (wikilink && onWikilinkClick) {
      const title = wikilink.getAttribute("data-title");
      if (title) onWikilinkClick(title);
    }
  }

  return (
    <div
      ref={containerRef}
      className="markdown-preview h-full overflow-auto px-8 py-7"
      dangerouslySetInnerHTML={{ __html: html }}
      onClick={handleClick}
    />
  );
}
