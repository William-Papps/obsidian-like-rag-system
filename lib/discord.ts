const DISCORD_API = "https://discord.com/api/v10";
export const DISCORD_APP_ID = "1495923252470480956";
export const DISCORD_VERIFIED_ROLE_ID = "1504783987736969328";

function botToken(): string {
  const t = process.env.DISCORD_BOT_TOKEN?.trim();
  if (!t) throw new Error("DISCORD_BOT_TOKEN is not set");
  return t;
}

function guildId(): string {
  const g = process.env.DISCORD_GUILD_ID?.trim();
  if (!g) throw new Error("DISCORD_GUILD_ID is not set");
  return g;
}

export async function addVerifiedRole(discordUserId: string): Promise<void> {
  const res = await fetch(
    `${DISCORD_API}/guilds/${guildId()}/members/${discordUserId}/roles/${DISCORD_VERIFIED_ROLE_ID}`,
    { method: "PUT", headers: { Authorization: `Bot ${botToken()}` } }
  );
  if (!res.ok && res.status !== 204) {
    throw new Error(`Discord role assignment failed: ${res.status} ${await res.text()}`);
  }
}

// Verify an interaction request from Discord using Ed25519 (no extra packages needed).
export async function verifyDiscordRequest(
  body: string,
  signature: string,
  timestamp: string
): Promise<boolean> {
  const publicKey = process.env.DISCORD_PUBLIC_KEY?.trim();
  if (!publicKey) return false;
  try {
    const key = await globalThis.crypto.subtle.importKey(
      "raw",
      Buffer.from(publicKey, "hex"),
      { name: "Ed25519" },
      false,
      ["verify"]
    );
    return await globalThis.crypto.subtle.verify(
      "Ed25519",
      key,
      Buffer.from(signature, "hex"),
      Buffer.from(timestamp + body)
    );
  } catch {
    return false;
  }
}
