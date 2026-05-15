import { redirect } from "next/navigation";
import { getCurrentUserOptional } from "@/lib/auth";
import { DiscordVerifyUI } from "@/components/discord-verify-ui";

export const dynamic = "force-dynamic";

export default async function DiscordVerifyPage({
  searchParams
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) redirect("/");

  const user = await getCurrentUserOptional();
  if (!user) {
    redirect(`/auth?next=${encodeURIComponent(`/discord-verify?token=${token}`)}`);
  }

  return <DiscordVerifyUI token={token} userName={user.name} />;
}
