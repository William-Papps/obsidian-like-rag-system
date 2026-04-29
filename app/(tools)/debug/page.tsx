import { Bug } from "lucide-react";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function DebugPage() {
  return (
    <ComingSoon
      icon={Bug}
      name="Debug Helper"
      description="Paste stack traces, error messages, or broken code and get structured diagnostic steps."
      features={[
        "Stack trace parser for Node, Python, Rust, Java",
        "Error pattern recognition library",
        "Step-by-step fix suggestions",
        "Diff viewer for before/after patches",
        "Save debug sessions to Notes",
      ]}
    />
  );
}
