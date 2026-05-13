"use client";

import { FileText, Sparkles, Upload, X } from "lucide-react";
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
  const [enhanceStructure, setEnhanceStructure] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isPdf = file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";
    const isImage = file.type.startsWith("image/") || /\.(png|jpg|jpeg|webp|gif|bmp|tif|tiff)$/i.test(file.name.toLowerCase());
    const isDocx = file.name.toLowerCase().endsWith(".docx");
    setSelectedFile({ name: file.name, size: file.size, isPdf });
    setIsLoading(true);
    const applyEnhance = enhanceStructure && !isPdf && !isImage && !isDocx;
    setStatusText(applyEnhance ? "Converting and enhancing structure…" : isPdf ? "Extracting text from PDF…" : "Converting document…");

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (applyEnhance) formData.append("enhanceStructure", "true");

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
    setStatusText(enhanceStructure ? "Converting and enhancing structure…" : "Converting text…");
    try {
      const formData = new FormData();
      formData.append("text", text);
      if (enhanceStructure) formData.append("enhanceStructure", "true");

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
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-graphite-rail bg-[#0b0e14] flex flex-col max-h-[calc(100vh-2rem)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-graphite-rail px-6 py-4">
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
                <div className="w-full rounded-xl border border-graphite-rail bg-black/50 px-4 py-3 text-left">
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
            <div className="space-y-4 overflow-y-auto flex-1 px-6 py-4">
              {/* Import mode */}
              <div>
                <label className="mb-2 block text-sm font-medium text-ink-300">Import mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setImportMode("single")}
                    className={`rounded-lg border px-3 py-2 text-sm ${importMode === "single" ? "border-accent-500/40 bg-accent-500/10 text-accent-200" : "border-graphite-rail/50 text-ink-400 hover:bg-graphite-rail/20"}`}
                  >
                    Single note
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportMode("split")}
                    className={`rounded-lg border px-3 py-2 text-sm ${importMode === "split" ? "border-accent-500/40 bg-accent-500/10 text-accent-200" : "border-graphite-rail/50 text-ink-400 hover:bg-graphite-rail/20"}`}
                  >
                    Split by headings
                  </button>
                </div>
              </div>

              {/* AI structure toggle */}
              <button
                type="button"
                onClick={() => setEnhanceStructure((v) => !v)}
                className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                  enhanceStructure
                    ? "border-accent-500/40 bg-accent-500/8"
                    : "border-graphite-rail hover:border-graphite-rail hover:bg-graphite-rail/20"
                }`}
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${enhanceStructure ? "bg-accent-500/20" : "bg-ink-800"}`}>
                  <Sparkles className={`h-4 w-4 ${enhanceStructure ? "text-accent-400" : "text-ink-500"}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`text-sm font-medium ${enhanceStructure ? "text-accent-200" : "text-ink-300"}`}>Detect structure with AI</div>
                  <div className="text-xs text-ink-500">Adds headings, lists, and tables to plain text. Skipped for PDF, DOCX, and images.</div>
                </div>
                <div className={`h-4 w-7 shrink-0 rounded-full transition-colors ${enhanceStructure ? "bg-accent-500" : "bg-ink-700"}`}>
                  <div className={`mt-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform ${enhanceStructure ? "translate-x-3.5" : "translate-x-0.5"}`} />
                </div>
              </button>

              <div>
                <label className="mb-2 block text-sm font-medium text-ink-300">Note title override</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Optional custom note title"
                  className="w-full rounded-lg border border-graphite-rail bg-black px-3 py-2 text-sm text-ink-100 placeholder-ink-500 focus:border-electric-blue/50 focus:outline-none"
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
                  <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-graphite-rail/60 px-4 py-8 transition hover:border-electric-blue/40 hover:bg-electric-blue/5">
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
                  className="min-h-[120px] w-full rounded-lg border border-graphite-rail bg-black px-3 py-2 text-sm text-ink-100 placeholder-ink-500 focus:border-electric-blue/50 focus:outline-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 border-t border-graphite-rail px-6 py-4">
              <button
                onClick={onClose}
                className="flex-1 rounded-lg border border-graphite-rail px-4 py-2 text-sm font-medium text-ink-300 hover:bg-graphite-rail/30 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleTextImport}
                disabled={!text.trim()}
                className="flex-1 rounded-[6px] border border-electric-blue px-4 py-2 text-sm font-semibold text-white hover:bg-electric-blue/10 transition-colors disabled:opacity-60"
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
