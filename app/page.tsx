import { redirect } from "next/navigation";
import { Workspace } from "@/components/workspace";
import { getCurrentUserOptional } from "@/lib/auth";

export default async function HomePage() {
  const user = await getCurrentUserOptional();
  if (!user) redirect("/auth");
  return <Workspace />;
}
