import fs from "fs";
import path from "path";
import initSqlJs, { type Database, type SqlJsStatic, type SqlValue } from "sql.js";

let sql: SqlJsStatic | null = null;
let db: Database | null = null;
let dbPath = "";

export async function getDb() {
  if (db) return db;

  const dataDir = path.join(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });
  dbPath = path.join(dataDir, "study.db");
  sql = await initSqlJs({
    locateFile: (file) => path.join(process.cwd(), "node_modules", "sql.js", "dist", file)
  });
  db = fs.existsSync(dbPath) ? new sql.Database(fs.readFileSync(dbPath)) : new sql.Database();
  migrate(db);
  persist();
  return db;
}

export async function dbExec(statement: string) {
  const database = await getDb();
  database.exec(statement);
  persist();
}

export async function dbRun(statement: string, params: SqlValue[] = []) {
  const database = await getDb();
  database.run(statement, params);
  persist();
}

export async function dbGet<T extends Record<string, unknown>>(statement: string, params: SqlValue[] = []) {
  const database = await getDb();
  const prepared = database.prepare(statement);
  try {
    prepared.bind(params);
    return prepared.step() ? (prepared.getAsObject() as T) : null;
  } finally {
    prepared.free();
  }
}

export async function dbAll<T extends Record<string, unknown>>(statement: string, params: SqlValue[] = []) {
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
  `);
}
