// Run once to register the /verify slash command with Discord:
//   node scripts/register-discord-commands.mjs
// Requires DISCORD_BOT_TOKEN in your .env (or set it in the shell).

// Load env files without needing dotenv (Node 20+). Mirror Next.js priority: .env.local overrides .env
try { process.loadEnvFile(".env"); } catch { /* ok */ }
try { process.loadEnvFile(".env.local"); } catch { /* ok */ }

const APP_ID = "1495923252470480956";
const TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

if (!TOKEN) {
  console.error("DISCORD_BOT_TOKEN is not set. Add it to .env.local first.");
  process.exit(1);
}
if (!GUILD_ID) {
  console.error("DISCORD_GUILD_ID is not set. Add it to .env.local first.");
  process.exit(1);
}

const commands = [
  {
    name: "verify",
    description: "Link your Discord account to your EternalNotes account and receive your verified role"
  }
];

// Guild-specific commands are instant (global commands take up to 1 hour)
const res = await fetch(`https://discord.com/api/v10/applications/${APP_ID}/guilds/${GUILD_ID}/commands`, {
  method: "PUT",
  headers: {
    Authorization: `Bot ${TOKEN}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify(commands)
});

if (!res.ok) {
  console.error("Failed to register commands:", await res.text());
  process.exit(1);
}

console.log("✓ /verify slash command registered to your server instantly.");
