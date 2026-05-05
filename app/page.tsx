import { unstable_noStore as noStore } from "next/cache";
import { getCurrentUserOptional } from "@/lib/auth";
import { Workspace } from "@/components/workspace";
import { LandingPage } from "@/components/landing-page";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RootPage() {
  noStore();
  const user = await getCurrentUserOptional();
  if (user) return <Workspace />;
  return <LandingPage />;
}
