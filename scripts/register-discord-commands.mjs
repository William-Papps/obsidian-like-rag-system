// Run once to register the /verify slash command with Discord:
//   node scripts/register-discord-commands.mjs
// Requires DISCORD_BOT_TOKEN in your .env (or set it in the shell).

import { config } from "dotenv";
config();

const APP_ID = "1495923252470480956";
const TOKEN = process.env.DISCORD_BOT_TOKEN;

if (!TOKEN) {
  console.error("DISCORD_BOT_TOKEN is not set. Add it to .env first.");
  process.exit(1);
}

const commands = [
  {
    name: "verify",
    description: "Link your Discord account to your EternalNotes account and receive your verified role"
  }
];

const res = await fetch(`https://discord.com/api/v10/applications/${APP_ID}/commands`, {
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

console.log("✓ /verify slash command registered successfully.");
