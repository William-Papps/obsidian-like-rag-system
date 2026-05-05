"use client";

import { FileText, Upload, X } from "lucide-react";
import { useRef, useState } from "react";

type DocumentImportModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onImport: (markdown: string, fileName: string, options: { importMode: "single" | "split"; title?: string }) => void;
  notify: (message: string, tone?: "success" | "info" | "error") => void;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentImportModal({ isOpen, onClose, onImport, notify }: DocumentImportModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [text, setText] = useState("");
  const [importMode, setImportMode] = useState<"single" | "split">("single");
  const [title, setTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<{ name: string; size: number; isPdf: boolean } | null>(null);
  const [statusText, setStatusText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isPdf = file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";
    setSelectedFile({ name: file.name, size: file.size, isPdf });
    setIsLoading(true);
    setStatusText(isPdf ? "Extracting text from PDF…" : "Converting document…");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/convert", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(error.error || `Conversion failed (${response.status})`);
      }

      const data = await response.json();
      notify("Document converted successfully", "success");
      for (const warning of (data.warnings as string[] | undefined) ?? []) {
        notify(warning, "info");
      }
      onImport(data.markdown, data.fileName, { importMode, title: title.trim() || undefined });
      onClose();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to convert document", "error");
    } finally {
      setIsLoading(false);
      setSelectedFile(null);
      setStatusText("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleTextImport = async () => {
    if (!text.trim()) {
      notify("Please enter some text", "info");
      return;
    }

    setIsLoading(true);
    setStatusText("Converting text…");
    try {
      const formData = new FormData();
      formData.append("text", text);

      const response = await fetch("/api/convert", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Conversion failed");
      }

      const data = await response.json();
      notify("Text converted to markdown", "success");
      for (const warning of (data.warnings as string[] | undefined) ?? []) {
        notify(warning, "info");
      }
      onImport(data.markdown, "pasted-content", { importMode, title: title.trim() || undefined });
      setText("");
      onClose();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to convert text", "error");
    } finally {
      setIsLoading(false);
      setStatusText("");
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={isLoading ? undefined : onClose} />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-ink-700/80 bg-ink-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ink-700/80 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-ink-100">Import Document</h2>
            <p className="mt-1 text-xs text-ink-500">Convert DOCX, PDFs, screenshots, and plain text into Markdown notes</p>
          </div>
          <button onClick={isLoading ? undefined : onClose} className="rounded-lg p-1.5 hover:bg-ink-800 disabled:opacity-40" disabled={isLoading}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Processing state */}
        {isLoading ? (
          <div className="px-6 py-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-accent-500/30 bg-accent-500/10">
                <FileText className="h-6 w-6 text-accent-400" />
              </div>

              {selectedFile && (
                <div className="w-full rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-left">
                  <div className="truncate text-sm font-medium text-ink-100">{selectedFile.name}</div>
                  <div className="mt-0.5 text-xs text-ink-500">{formatBytes(selectedFile.size)}</div>
                </div>
              )}

              <div className="w-full">
                <div className="mb-2 flex items-center justify-between text-xs text-ink-400">
                  <span>{statusText}</span>
                </div>
                {/* Indeterminate animated bar */}
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-800">
                  <div className="h-full w-1/3 animate-[slide_1.4s_ease-in-out_infinite] rounded-full bg-accent-500" />
                </div>
              </div>

              {selectedFile?.isPdf && selectedFile.size > 5 * 1024 * 1024 && (
                <p className="text-xs leading-5 text-ink-500">
                  Large PDF detected — extraction may take 30–90 seconds. Please keep this window open.
                </p>
              )}

              <button
                onClick={() => {
                  setIsLoading(false);
                  setSelectedFile(null);
                  setStatusText("");
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="text-xs text-ink-500 underline underline-offset-2 hover:text-ink-300"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Content */}
            <div className="space-y-4 px-6 py-4">
              {/* Import mode */}
              <div>
                <label className="mb-2 block text-sm font-medium text-ink-300">Import mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setImportMode("single")}
                    className={`rounded-lg border px-3 py-2 text-sm ${importMode === "single" ? "border-accent-500/40 bg-accent-500/10 text-accent-200" : "border-ink-700/80 text-ink-400 hover:bg-ink-800"}`}
                  >
                    Single note
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportMode("split")}
                    className={`rounded-lg border px-3 py-2 text-sm ${importMode === "split" ? "border-accent-500/40 bg-accent-500/10 text-accent-200" : "border-ink-700/80 text-ink-400 hover:bg-ink-800"}`}
                  >
                    Split by headings
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-ink-300">Note title override</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Optional custom note title"
                  className="w-full rounded-lg border border-ink-700/50 bg-ink-850 px-3 py-2 text-sm text-ink-100 placeholder-ink-500 focus:border-accent-500/50 focus:outline-none"
                />
              </div>

              {/* File upload */}
              <div>
                <label className="mb-2 block text-sm font-medium text-ink-300">Upload File</label>
                <div className="relative cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.txt,.md,.markdown,.text,.png,.jpg,.jpeg,.webp,.gif,.bmp,.tif,.tiff"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-ink-700/50 px-4 py-8 transition hover:border-accent-500/50 hover:bg-accent-500/5">
                    <div className="text-center">
                      <Upload className="mx-auto mb-2 h-8 w-8 text-ink-500" />
                      <p className="text-sm font-medium text-ink-300">Click to upload a document</p>
                      <p className="mt-1 text-xs text-ink-500">PDF, DOCX, images, TXT, MD — up to 50 MB</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-ink-700/30" />
                <span className="text-xs text-ink-500">OR</span>
                <div className="h-px flex-1 bg-ink-700/30" />
              </div>

              {/* Text input */}
              <div>
                <label className="mb-2 block text-sm font-medium text-ink-300">Paste Text</label>
                <p className="mb-2 text-xs leading-5 text-ink-500">
                  Image text extraction uses your configured vision model and stores the extracted text inside the note.
                </p>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste document text, meeting notes, research, or reports here..."
                  className="min-h-[120px] w-full rounded-lg border border-ink-700/50 bg-ink-850 px-3 py-2 text-sm text-ink-100 placeholder-ink-500 focus:border-accent-500/50 focus:outline-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 border-t border-ink-700/80 px-6 py-4">
              <button
                onClick={onClose}
                className="flex-1 rounded-lg border border-ink-700/80 px-4 py-2 text-sm font-medium text-ink-300 hover:bg-ink-800"
              >
                Cancel
              </button>
              <button
                onClick={handleTextImport}
                disabled={!text.trim()}
                className="flex-1 rounded-lg bg-accent-500 px-4 py-2 text-sm font-semibold text-ink-950 hover:bg-accent-400 disabled:opacity-60"
              >
                Convert & Import
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
