import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const initSqlJs = require("sql.js");

const dataDir = process.env.DATA_DIR?.trim() || path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "study.db");

if (!fs.existsSync(dbPath)) {
  console.error("Database not found at:", dbPath);
  process.exit(1);
}

const SQL = await initSqlJs({
  locateFile: (file) => path.join(process.cwd(), "node_modules", "sql.js", "dist", file),
});

const db = new SQL.Database(fs.readFileSync(dbPath));

const username = process.argv[2];
const plan = process.argv[3] || "pro";

if (!username) {
  console.error("Usage: node scripts/set-hosted-plan.mjs <username> [plan]");
  console.error("Plans: free | starter | pro");
  process.exit(1);
}

// Find user
const userRows = db.exec(`SELECT id, name, email FROM users WHERE name = '${username}' OR email = '${username}'`);
if (!userRows.length || !userRows[0].values.length) {
  console.error(`User not found: ${username}`);
  // List all users to help
  const all = db.exec("SELECT name, email FROM users");
  if (all.length) {
    console.log("Available users:");
    all[0].values.forEach(([name, email]) => console.log(` - ${name} (${email})`));
  }
  process.exit(1);
}

const [userId, name, email] = userRows[0].values[0];
console.log(`Found user: ${name} (${email}) [${userId}]`);

// Update or insert provider_settings
const existing = db.exec(`SELECT id FROM provider_settings WHERE user_id = '${userId}'`);
const now = new Date().toISOString();

if (existing.length && existing[0].values.length) {
  db.run(`UPDATE provider_settings SET hosted_plan = '${plan}', updated_at = '${now}' WHERE user_id = '${userId}'`);
  console.log(`Updated hosted_plan to "${plan}"`);
} else {
  const newId = Math.random().toString(36).slice(2) + Date.now().toString(36);
  db.run(`INSERT INTO provider_settings (id, user_id, provider, hosted_plan, embedding_model, answer_model, created_at, updated_at)
          VALUES ('${newId}', '${userId}', 'openai', '${plan}', 'text-embedding-3-small', 'gpt-4o-mini', '${now}', '${now}')`);
  console.log(`Created provider_settings with hosted_plan "${plan}"`);
}

// Save back to disk
fs.writeFileSync(dbPath, Buffer.from(db.export()));
db.close();
console.log("Database saved. Done.");
process.exit(0);
