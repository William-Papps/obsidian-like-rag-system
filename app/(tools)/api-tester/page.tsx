import { Webhook } from "lucide-react";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function ApiTesterPage() {
  return (
    <ComingSoon
      icon={Webhook}
      name="API Tester"
      description="Send HTTP requests, inspect responses, and save collections — a lightweight Postman alternative."
      features={[
        "GET, POST, PUT, PATCH, DELETE",
        "Headers, body (JSON, form, raw), auth",
        "Response inspector with syntax highlighting",
        "Saved request collections",
        "Environment variables for base URLs and tokens",
      ]}
    />
  );
}
