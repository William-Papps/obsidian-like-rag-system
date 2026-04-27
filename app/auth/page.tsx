import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUserOptional, selfSignupEnabled } from "@/lib/auth";

export default async function AuthPage() {
  const user = await getCurrentUserOptional();
  if (user) redirect("/");

  return <AuthForm allowSignup={await selfSignupEnabled()} />;
}
