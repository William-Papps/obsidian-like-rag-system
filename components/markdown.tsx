"use client";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char] || char);
}

export function MarkdownPreview({ markdown }: { markdown: string }) {
  const html = renderMarkdown(markdown);
  return <div className="markdown-preview h-full overflow-auto px-8 py-7" dangerouslySetInnerHTML={{ __html: html }} />;
}

function renderMarkdown(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  const blocks: string[] = [];
  let list: string[] = [];
  let code: string[] = [];
  let inCode = false;

  const flushList = () => {
    if (list.length) {
      blocks.push(`<ul>${list.map((item) => `<li>${inline(item)}</li>`).join("")}</ul>`);
      list = [];
    }
  };

  const flushCode = () => {
    if (code.length) {
      blocks.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
      code = [];
    }
  };

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCode) flushCode();
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      code.push(line);
      continue;
    }
    if (!line.trim()) {
      flushList();
      continue;
    }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      flushList();
      blocks.push(`<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`);
      continue;
    }
    const item = /^[-*]\s+(.+)$/.exec(line);
    if (item) {
      list.push(item[1]);
      continue;
    }
    flushList();
    blocks.push(`<p>${inline(line)}</p>`);
  }
  flushList();
  flushCode();
  return blocks.join("");
}

function inline(value: string) {
  return escapeHtml(value)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}
