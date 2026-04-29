import { Zap } from "lucide-react";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function PromptsPage() {
  return (
    <ComingSoon
      icon={Zap}
      name="Prompt Builder"
      description="Compose, test, and save reusable prompt templates with variable slots and chaining."
      features={[
        "Variable interpolation with {{slot}} syntax",
        "Template library with categories",
        "Live preview against any model",
        "Chain prompts with output piping",
        "Export as API-ready JSON",
      ]}
    />
  );
}
