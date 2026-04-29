import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUserOptional, selfSignupEnabled } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AuthPage() {
  const user = await getCurrentUserOptional();
  if (user) redirect("/");

  let allowSignup = true;
  try {
    allowSignup = await selfSignupEnabled();
  } catch {
    // DB not ready yet — default to allowing signup so the page renders
  }

  return (
    <Suspense>
      <AuthForm allowSignup={allowSignup} />
    </Suspense>
  );
}
