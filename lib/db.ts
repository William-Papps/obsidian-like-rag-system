import fs from "fs";
import path from "path";
import initSqlJs, { type Database, type SqlJsStatic } from "sql.js";

export type DbValue = string | number | null | Uint8Array;

let sql: SqlJsStatic | null = null;
let db: Database | null = null;
let dbPath = "";
let lastMtime = 0;
let migrated = false;

function appRoot() {
  return process.env.APP_DIR?.trim() || process.cwd();
}

function dataDir() {
  return process.env.DATA_DIR?.trim() || path.join(appRoot(), "data");
}

export async function getDb() {
  const dir = dataDir();
  fs.mkdirSync(dir, { recursive: true });
  dbPath = path.join(dir, "study.db");

  if (!sql) {
    sql = await initSqlJs({
      locateFile: (file) => path.join(appRoot(), "node_modules", "sql.js", "dist", file)
    });
  }

  // Reload from disk only when another worker has written since we last loaded.
  // Eliminates the per-request disk read while still picking up cross-worker writes.
  const currentMtime = fs.existsSync(dbPath) ? fs.statSync(dbPath).mtimeMs : 0;
  if (!db || currentMtime !== lastMtime) {
    db = fs.existsSync(dbPath) ? new sql.Database(fs.readFileSync(dbPath)) : new sql.Database();
    lastMtime = currentMtime;
    migrated = false;
  }

  if (!migrated) {
    migrate(db);
    migrated = true;
    persist();
  }

  return db;
}

export async function exportDatabaseBuffer() {
  const database = await getDb();
  return Buffer.from(database.export());
}

export async function dbExec(statement: string) {
  const database = await getDb();
  database.exec(statement);
  persist();
}

export async function dbRun(statement: string, params: DbValue[] = []) {
  const database = await getDb();
  database.run(statement, params);
  persist();
}

export async function dbGet<T extends Record<string, unknown>>(statement: string, params: DbValue[] = []) {
  const database = await getDb();
  const prepared = database.prepare(statement);
  try {
    prepared.bind(params);
    return prepared.step() ? (prepared.getAsObject() as T) : null;
  } finally {
    prepared.free();
  }
}

export async function dbAll<T extends Record<string, unknown>>(statement: string, params: DbValue[] = []) {
  const database = await getDb();
  const prepared = database.prepare(statement);
  const rows: T[] = [];
  try {
    prepared.bind(params);
    while (prepared.step()) rows.push(prepared.getAsObject() as T);
    return rows;
  } finally {
    prepared.free();
  }
}

function persist() {
  if (!db || !dbPath) return;
  fs.writeFileSync(dbPath, Buffer.from(db.export()));
  // Track our own write so we don't reload ourselves on the next getDb() call.
  lastMtime = fs.existsSync(dbPath) ? fs.statSync(dbPath).mtimeMs : 0;
}

function migrate(database: Database) {
  database.exec(`
    pragma foreign_keys = on;

    create table if not exists users (
      id text primary key,
      email text not null unique,
      name text not null,
      created_at text not null,
      updated_at text not null
    );

    create table if not exists folders (
      id text primary key,
      user_id text not null references users(id) on delete cascade,
      parent_id text references folders(id) on delete cascade,
      name text not null,
      created_at text not null,
      updated_at text not null
    );

    create index if not exists idx_folders_user on folders(user_id);

    create table if not exists notes (
      id text primary key,
      user_id text not null references users(id) on delete cascade,
      folder_id text references folders(id) on delete set null,
      title text not null,
      markdown_content text not null default '',
      content_hash text not null,
      created_at text not null,
      updated_at text not null
    );

    create index if not exists idx_notes_user on notes(user_id);
    create index if not exists idx_notes_folder on notes(user_id, folder_id);

    create table if not exists chunks (
      id text primary key,
      user_id text not null references users(id) on delete cascade,
      note_id text not null references notes(id) on delete cascade,
      chunk_text text not null,
      chunk_index integer not null,
      content_hash text not null,
      embedded integer not null default 0,
      vector_id text,
      vector_json text,
      created_at text not null,
      updated_at text not null,
      unique(note_id, chunk_index, content_hash)
    );

    create index if not exists idx_chunks_user on chunks(user_id);
    create index if not exists idx_chunks_note on chunks(user_id, note_id);

    create table if not exists provider_settings (
      id text primary key,
      user_id text not null references users(id) on delete cascade,
      provider text not null default 'openai',
      local_secret_ref text,
      masked_key text,
      project_id text,
      embedding_model text not null default 'text-embedding-3-small',
      answer_model text not null default 'gpt-4o-mini',
      vision_model text,
      created_at text not null,
      updated_at text not null,
      unique(user_id, provider)
    );

    create table if not exists flashcards (
      id text primary key,
      user_id text not null references users(id) on delete cascade,
      note_id text references notes(id) on delete set null,
      prompt text not null,
      answer text not null,
      source_excerpt text not null,
      created_at text not null,
      updated_at text not null
    );

    create table if not exists quiz_attempts (
      id text primary key,
      user_id text not null references users(id) on delete cascade,
      scope text not null,
      score integer,
      created_at text not null,
      updated_at text not null
    );

    create table if not exists sessions (
      id text primary key,
      user_id text not null references users(id) on delete cascade,
      token_hash text not null unique,
      expires_at text not null,
      created_at text not null,
      last_used_at text not null
    );

    create index if not exists idx_sessions_user on sessions(user_id);
    create index if not exists idx_sessions_expires on sessions(expires_at);

    create table if not exists rate_limits (
      key text primary key,
      count integer not null,
      reset_at text not null,
      created_at text not null,
      updated_at text not null
    );

    create index if not exists idx_rate_limits_reset on rate_limits(reset_at);

    create table if not exists ai_usage (
      id text primary key,
      user_id text not null references users(id) on delete cascade,
      period text not null,
      feature text not null,
      count integer not null default 0,
      created_at text not null,
      updated_at text not null,
      unique(user_id, period, feature)
    );

    create index if not exists idx_ai_usage_user_period on ai_usage(user_id, period);

    create table if not exists email_verifications (
      id text primary key,
      user_id text not null references users(id) on delete cascade,
      email text not null,
      code_hash text not null,
      expires_at text not null,
      consumed_at text,
      created_at text not null,
      updated_at text not null
    );

    create index if not exists idx_email_verifications_user on email_verifications(user_id);
    create index if not exists idx_email_verifications_email on email_verifications(email);

    create table if not exists app_settings (
      key text primary key,
      value text not null,
      created_at text not null,
      updated_at text not null
    );

    create table if not exists billing_profiles (
      id text primary key,
      user_id text not null references users(id) on delete cascade unique,
      billing_name text,
      billing_email text,
      created_at text not null,
      updated_at text not null
    );

    create table if not exists subscriptions (
      id text primary key,
      user_id text not null references users(id) on delete cascade unique,
      plan text not null default 'free',
      status text not null default 'free',
      provider text not null default 'none',
      provider_customer_id text,
      provider_subscription_id text,
      current_period_start text,
      current_period_end text,
      cancel_at_period_end integer not null default 0,
      hosted_access_granted_at text,
      created_at text not null,
      updated_at text not null
    );

    create index if not exists idx_subscriptions_plan_status on subscriptions(plan, status);

    create table if not exists audit_logs (
      id text primary key,
      actor_user_id text references users(id) on delete set null,
      level text not null,
      event text not null,
      metadata_json text,
      created_at text not null
    );

    create index if not exists idx_audit_logs_created on audit_logs(created_at desc);

    create table if not exists study_activity (
      id text primary key,
      user_id text not null references users(id) on delete cascade,
      kind text not null,
      scope_label text,
      note_title text,
      created_at text not null
    );

    create index if not exists idx_study_activity_user_created on study_activity(user_id, created_at desc);

    create table if not exists tags (
      id text primary key,
      user_id text not null references users(id) on delete cascade,
      name text not null,
      color text not null default '#8B5CF6',
      created_at text not null,
      updated_at text not null,
      unique(user_id, name)
    );

    create index if not exists idx_tags_user on tags(user_id);

    create table if not exists note_tags (
      note_id text not null references notes(id) on delete cascade,
      tag_id text not null references tags(id) on delete cascade,
      created_at text not null,
      primary key(note_id, tag_id)
    );

    create index if not exists idx_note_tags_note on note_tags(note_id);
    create index if not exists idx_note_tags_tag on note_tags(tag_id);

    create table if not exists images (
      id text primary key,
      user_id text not null references users(id) on delete cascade,
      filename text not null,
      content_type text not null,
      created_at text not null
    );

    create index if not exists idx_images_user on images(user_id);

    create table if not exists password_reset_tokens (
      id text primary key,
      user_id text not null references users(id) on delete cascade,
      token_hash text not null unique,
      expires_at text not null,
      consumed_at text,
      created_at text not null
    );

    create index if not exists idx_password_reset_user on password_reset_tokens(user_id);
  `);

  ensureColumn(database, "users", "password_hash", "text");
  ensureColumn(database, "users", "email_verified_at", "text");
  ensureColumn(database, "users", "role", "text default 'user'");
  ensureColumn(database, "users", "disabled_at", "text");
  ensureColumn(database, "provider_settings", "hosted_plan", "text default 'free'");
  ensureColumn(database, "subscriptions", "hosted_access_granted_at", "text");
  ensureColumn(database, "flashcards", "next_review_at", "text");
  ensureColumn(database, "flashcards", "interval_days", "real default 1");
  ensureColumn(database, "flashcards", "ease_factor", "real default 2.5");
  ensureColumn(database, "flashcards", "review_count", "integer default 0");
  ensureColumn(database, "flashcards", "last_reviewed_at", "text");
  ensureColumn(database, "chunks", "vector_blob", "blob");
}

function ensureColumn(database: Database, table: string, column: string, type: string) {
  const rows = database.exec(`pragma table_info(${table});`);
  const existing = rows[0]?.values.some((value) => String(value[1]) === column);
  if (!existing) {
    database.exec(`alter table ${table} add column ${column} ${type};`);
  }
}
