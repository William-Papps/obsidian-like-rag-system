import { FileSearch } from "lucide-react";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function FilesPage() {
  return (
    <ComingSoon
      icon={FileSearch}
      name="File Analyzer"
      description="Upload any file and extract structured insights — summaries, key points, entities, and more."
      features={[
        "PDF, DOCX, CSV, JSON, plain text",
        "AI-powered summary and Q&A",
        "Table and data extraction",
        "Auto-import into your Notes vault",
        "Batch processing for multiple files",
      ]}
    />
  );
}
