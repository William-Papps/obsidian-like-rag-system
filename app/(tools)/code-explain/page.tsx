import { Code2 } from "lucide-react";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function CodeExplainPage() {
  return (
    <ComingSoon
      icon={Code2}
      name="Code Explainer"
      description="Paste any code snippet and get a plain-English breakdown of what it does, line by line."
      features={[
        "Multi-language support (TS, Python, Rust, Go, SQL…)",
        "Inline annotation mode",
        "Complexity and performance notes",
        "Security vulnerability scanner",
        "Share explanations as markdown",
      ]}
    />
  );
}
