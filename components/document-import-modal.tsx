"use client";

import { Upload, X } from "lucide-react";
import { useRef, useState } from "react";

type DocumentImportModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onImport: (markdown: string, fileName: string, options: { importMode: "single" | "split"; title?: string }) => void;
  notify: (message: string, tone?: "success" | "info" | "error") => void;
};

export function DocumentImportModal({ isOpen, onClose, onImport, notify }: DocumentImportModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [text, setText] = useState("");
  const [importMode, setImportMode] = useState<"single" | "split">("single");
  const [title, setTitle] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/convert", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Conversion failed");
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
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-ink-700/80 bg-ink-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ink-700/80 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-ink-100">Import Document</h2>
            <p className="mt-1 text-xs text-ink-500">Convert DOCX, screenshots, and plain text into clean Markdown source notes</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-ink-800"
            disabled={isLoading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 px-6 py-4">
          {/* File Upload */}
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
              disabled={isLoading}
              className="w-full rounded-lg border border-ink-700/50 bg-ink-850 px-3 py-2 text-sm text-ink-100 placeholder-ink-500 focus:border-accent-500/50 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-ink-300">Upload File</label>
            <div
              className="relative cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx,.txt,.md,.markdown,.text,.png,.jpg,.jpeg,.webp,.gif,.bmp,.tif,.tiff"
                onChange={handleFileSelect}
                disabled={isLoading}
                className="hidden"
              />
              <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-ink-700/50 px-4 py-8 transition hover:border-accent-500/50 hover:bg-accent-500/5">
                <div className="text-center">
                  <Upload className="mx-auto h-8 w-8 text-ink-500 mb-2" />
                  <p className="text-sm font-medium text-ink-300">
                    {isLoading ? "Extracting..." : "Click to upload a document or screenshot"}
                  </p>
                  <p className="mt-1 text-xs text-ink-500">DOCX, screenshots, TXT, MD, and other plain text files</p>
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

          {/* Text Input */}
          <div>
            <label className="mb-2 block text-sm font-medium text-ink-300">Paste Text</label>
            <p className="mb-2 text-xs leading-5 text-ink-500">
              Image text extraction uses your configured vision model and stores the extracted text inside the note so RAG stays grounded in saved note content.
            </p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste lecture notes, document text, or slide text here..."
              disabled={isLoading}
              className="min-h-[120px] w-full rounded-lg border border-ink-700/50 bg-ink-850 px-3 py-2 text-sm text-ink-100 placeholder-ink-500 focus:border-accent-500/50 focus:outline-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-ink-700/80 px-6 py-4">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 rounded-lg border border-ink-700/80 px-4 py-2 text-sm font-medium text-ink-300 hover:bg-ink-800 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={handleTextImport}
            disabled={isLoading || !text.trim()}
            className="flex-1 rounded-lg bg-accent-500 px-4 py-2 text-sm font-semibold text-ink-950 hover:bg-accent-400 disabled:opacity-60"
          >
            {isLoading ? "Converting..." : "Convert & Import"}
          </button>
        </div>
      </div>
    </>
  );
}
