import fs from "fs";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");

const dataDir = process.env.DATA_DIR?.trim() || path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "study.db");

if (!fs.existsSync(dbPath)) {
  console.error("Database not found at:", dbPath);
  process.exit(1);
}

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

const username = process.argv[2];
const plan = process.argv[3] || "pro";

if (!username) {
  console.error("Usage: node scripts/set-hosted-plan.mjs <username> [plan]");
  console.error("Plans: free | starter | pro");
  process.exit(1);
}

const user = db.prepare("SELECT id, name, email FROM users WHERE name = ? OR email = ?").get(username, username);
if (!user) {
  console.error(`User not found: ${username}`);
  const all = db.prepare("SELECT name, email FROM users").all();
  if (all.length) {
    console.log("Available users:");
    all.forEach(({ name, email }) => console.log(` - ${name} (${email})`));
  }
  process.exit(1);
}

console.log(`Found user: ${user.name} (${user.email}) [${user.id}]`);

const now = new Date().toISOString();
const existing = db.prepare("SELECT id FROM provider_settings WHERE user_id = ?").get(user.id);

if (existing) {
  db.prepare("UPDATE provider_settings SET hosted_plan = ?, updated_at = ? WHERE user_id = ?").run(plan, now, user.id);
  console.log(`Updated hosted_plan to "${plan}"`);
} else {
  const newId = Math.random().toString(36).slice(2) + Date.now().toString(36);
  db.prepare(
    `INSERT INTO provider_settings (id, user_id, provider, hosted_plan, embedding_model, answer_model, created_at, updated_at)
     VALUES (?, ?, 'openai', ?, 'text-embedding-3-small', 'gpt-4o-mini', ?, ?)`
  ).run(newId, user.id, plan, now, now);
  console.log(`Created provider_settings with hosted_plan "${plan}"`);
}

db.close();
console.log("Done.");
process.exit(0);
