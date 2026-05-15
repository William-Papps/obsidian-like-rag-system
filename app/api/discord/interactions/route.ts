import { NextResponse } from "next/server";
import { verifyDiscordRequest } from "@/lib/discord";
import { createDiscordVerificationToken } from "@/lib/services/discord-verify";

export const dynamic = "force-dynamic";

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://notes.eternalbot.net";
}

export async function POST(request: Request) {
  const sig = request.headers.get("x-signature-ed25519") ?? "";
  const timestamp = request.headers.get("x-signature-timestamp") ?? "";
  const body = await request.text();

  if (!await verifyDiscordRequest(body, sig, timestamp)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const interaction = JSON.parse(body) as {
    type: number;
    data?: { name?: string };
    member?: { user?: { id?: string; username?: string } };
    user?: { id?: string; username?: string };
  };

  // Type 1 = PING (Discord verifies the endpoint)
  if (interaction.type === 1) {
    return NextResponse.json({ type: 1 });
  }

  // Type 2 = APPLICATION_COMMAND
  if (interaction.type === 2 && interaction.data?.name === "verify") {
    const discordUser = interaction.member?.user ?? interaction.user;
    const discordUserId = discordUser?.id;
    const discordUsername = discordUser?.username ?? "unknown";

    if (!discordUserId) {
      return NextResponse.json({
        type: 4,
        data: { content: "Could not identify your Discord user. Please try again.", flags: 64 }
      });
    }

    try {
      const token = await createDiscordVerificationToken(discordUserId, discordUsername);
      const url = `${appUrl()}/discord-verify?token=${token}`;
      return NextResponse.json({
        type: 4,
        data: {
          content: `To link your Discord to EternalNotes, click the link below:\n\n${url}\n\n*This link is only for you and expires in 15 minutes.*`,
          flags: 64 // ephemeral — only the user can see this
        }
      });
    } catch (err) {
      console.error("[discord/interactions] token creation failed:", err);
      return NextResponse.json({
        type: 4,
        data: { content: "Something went wrong. Please try again.", flags: 64 }
      });
    }
  }

  return NextResponse.json({
    type: 4,
    data: { content: "Unknown command.", flags: 64 }
  });
}
