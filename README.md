# StudyOS Notes

An Obsidian-like local study workspace with Markdown notes, SQLite persistence, and source-grounded RAG study tools.

The MVP is intentionally local-first, but the schema and service layer are user-scoped so the app can move toward hosted multi-user deployment without rewriting the core data model.

## What Works Now

- Three-pane study workspace: folders/classes, note editor/preview, and study tools.
- Real Markdown note CRUD with SQLite persistence.
- Folder/class organization and note assignment.
- Exact text search across persisted notes.
- User-scoped database tables with a default local user.
- Provider settings UI with masked OpenAI key display.
- Local API key storage under `data/secrets`, ignored by git.
- Note chunking with note title and heading context.
- Embedding/index table stored locally in SQLite.
- Reindex flow that skips unchanged notes when content hashes match.
- Ask-from-notes endpoint with citations/source excerpts.
- Offline fallback retrieval using deterministic local vectors when no OpenAI key is configured.
- Quiz, flashcard, and extractive summary tools generated from indexed excerpts.

## Grounding Rule

Notes are the source of truth. The answer prompt instructs the model to:

- answer only from provided notes
- avoid outside knowledge
- avoid guessing
- avoid debugging or prescribing fixes unless notes say so
- refuse when the retrieved excerpts do not support an answer

The UI always shows source excerpts for answers and study artifacts.

## Local Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Optional environment setup:

```bash
cp .env.example .env.local
```

You can also enter an OpenAI API key in Settings. Real keys must stay out of git.

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
```

## Data Storage

Local runtime data is written under `data/`:

- `data/study.db`
- `data/study.db-wal`
- `data/study.db-shm`
- `data/secrets/*`

This directory is ignored by git.

## Architecture

- `app/api/*`: Next.js API routes.
- `components/workspace.tsx`: main app workspace.
- `lib/db.ts`: SQLite connection and migrations.
- `lib/auth.ts`: default local user; future replacement point for real auth.
- `lib/services/*`: user-scoped notes, folders, and provider settings services.
- `lib/rag/*`: chunking, embeddings, indexing, retrieval, answers, and study tools.

Core tables include:

- `users`
- `folders`
- `notes`
- `chunks`
- `provider_settings`
- `flashcards`
- `quiz_attempts`

Tables that hold private user data include `user_id` and service methods require a user ID.

## Security Notes

This MVP is local development software, not a hosted security implementation.

Implemented now:

- `.env*`, local databases, and secret files are ignored.
- API routes do not return full API keys.
- Settings UI masks stored keys.
- Notes, chunks, and settings are scoped by `user_id`.
- OpenAI answer generation receives only retrieved note excerpts.

Before hosted deployment:

- Replace `getCurrentUser()` with real authentication.
- Replace local key files with encrypted per-user secret storage.
- Add authorization middleware for every route.
- Add rate limiting and audit logging.
- Use managed Postgres or another production database.
- Consider pgvector, LanceDB, or a hosted vector store for scalable retrieval.
- Add backups, data export, and account deletion workflows.

## Current Limitations

- Auth is a default local user only.
- Local API key storage is not suitable for hosted production.
- Study tool generation is extractive and deterministic unless an OpenAI key is used for Ask.
- Markdown preview supports common headings, lists, code blocks, bold, and inline code, not the full Obsidian syntax surface.
- Folder hierarchy fields exist, but the MVP UI displays a flat class/folder list.
- Learning outcomes and spaced repetition history are schema-ready but not fully implemented.
