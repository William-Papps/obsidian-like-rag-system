import { randomBytes } from "crypto";
import { nanoid } from "nanoid";
import { dbGet, dbRun } from "@/lib/db";

const TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes

export async function createDiscordVerificationToken(
  discordUserId: string,
  discordUsername: string
): Promise<string> {
  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();
  // Replace any existing token for this Discord user so they can re-run /verify
  await dbRun(
    `DELETE FROM discord_verification_tokens WHERE discord_user_id = ?`,
    [discordUserId]
  );
  await dbRun(
    `INSERT INTO discord_verification_tokens (id, token, discord_user_id, discord_username, expires_at)
     VALUES (?, ?, ?, ?, ?)`,
    [nanoid(), token, discordUserId, discordUsername, expiresAt]
  );
  return token;
}

export async function peekDiscordToken(token: string): Promise<{
  discordUsername: string;
  expiresAt: string;
} | null> {
  const row = await dbGet<{ discord_username: string; expires_at: string }>(
    `SELECT discord_username, expires_at FROM discord_verification_tokens WHERE token = ?`,
    [token]
  );
  if (!row) return null;
  if (new Date(row.expires_at) < new Date()) {
    await dbRun(`DELETE FROM discord_verification_tokens WHERE token = ?`, [token]);
    return null;
  }
  return { discordUsername: row.discord_username, expiresAt: row.expires_at };
}

export async function consumeDiscordToken(token: string): Promise<{
  discordUserId: string;
  discordUsername: string;
} | null> {
  const row = await dbGet<{ discord_user_id: string; discord_username: string; expires_at: string }>(
    `SELECT discord_user_id, discord_username, expires_at FROM discord_verification_tokens WHERE token = ?`,
    [token]
  );
  if (!row) return null;
  if (new Date(row.expires_at) < new Date()) {
    await dbRun(`DELETE FROM discord_verification_tokens WHERE token = ?`, [token]);
    return null;
  }
  await dbRun(`DELETE FROM discord_verification_tokens WHERE token = ?`, [token]);
  return { discordUserId: row.discord_user_id, discordUsername: row.discord_username };
}
