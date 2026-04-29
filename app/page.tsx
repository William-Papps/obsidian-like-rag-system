import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { getCurrentUserOptional } from "@/lib/auth";
import { Workspace } from "@/components/workspace";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RootPage() {
  noStore();
  const user = await getCurrentUserOptional();
  if (!user) redirect("/auth");
  return <Workspace />;
}
