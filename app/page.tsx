import { redirect } from "next/navigation";
import { Workspace } from "@/components/workspace";
import { getCurrentUserOptional } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  const user = await getCurrentUserOptional();
  if (!user) redirect("/auth");
  return <Workspace />;
}
