import { NextResponse } from "next/server";
import { withAuthenticatedUser } from "@/lib/auth";
import { dbGet, dbRun } from "@/lib/db";
import { addVerifiedRole, setNickname } from "@/lib/discord";
import { consumeDiscordToken, peekDiscordToken } from "@/lib/services/discord-verify";

export const dynamic = "force-dynamic";

// GET — return Discord username for the token so the page can show it before confirming
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const info = await peekDiscordToken(token);
  if (!info) {
    return NextResponse.json(
      { error: "This verification link is invalid or has expired. Run /verify again in Discord." },
      { status: 410 }
    );
  }
  return NextResponse.json({ discordUsername: info.discordUsername, expiresAt: info.expiresAt });
}

// POST — consume the token and link accounts
export async function POST(request: Request) {
  return withAuthenticatedUser(async (user) => {
    const { token } = (await request.json()) as { token: string };
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

    const result = await consumeDiscordToken(token);
    if (!result) {
      return NextResponse.json(
        { error: "This verification link is invalid or has expired. Run /verify again in Discord." },
        { status: 410 }
      );
    }

    // Prevent linking a Discord account already linked to a different EternalNotes account
    const existing = await dbGet<{ id: string }>(
      `SELECT id FROM users WHERE discord_user_id = ? AND id != ?`,
      [result.discordUserId, user.id]
    );
    if (existing) {
      return NextResponse.json(
        { error: "This Discord account is already linked to a different EternalNotes account." },
        { status: 409 }
      );
    }

    await dbRun(
      `UPDATE users SET discord_user_id = ?, updated_at = datetime('now') WHERE id = ?`,
      [result.discordUserId, user.id]
    );

    // Assign role and set nickname to their EternalNotes username — non-fatal if either fails
    try {
      await addVerifiedRole(result.discordUserId);
    } catch (err) {
      console.error("[discord/verify] Role assignment failed:", err);
    }
    try {
      await setNickname(result.discordUserId, user.name);
    } catch (err) {
      console.error("[discord/verify] Nickname update failed:", err);
    }

    return NextResponse.json({ success: true, discordUsername: result.discordUsername });
  });
}
