import { ArrowLeftRight } from "lucide-react";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function CodeConvertPage() {
  return (
    <ComingSoon
      icon={ArrowLeftRight}
      name="Code Converter"
      description="Convert code between languages while preserving intent, idioms, and structure."
      features={[
        "Python ↔ TypeScript ↔ Go ↔ Rust",
        "SQL dialect conversion (Postgres, MySQL, SQLite)",
        "Side-by-side diff view",
        "AI-assisted idiom mapping",
        "Export converted files directly",
      ]}
    />
  );
}
