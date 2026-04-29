import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { Workspace } from "@/components/workspace";
import { getCurrentUserOptional } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  noStore();
  const user = await getCurrentUserOptional();
  if (!user) redirect("/auth");
  return <Workspace />;
}
