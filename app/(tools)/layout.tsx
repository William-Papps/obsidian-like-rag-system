import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { getCurrentUserOptional } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  noStore();
  const user = await getCurrentUserOptional();
  if (!user) redirect("/auth");
  return <AppShell>{children}</AppShell>;
}
