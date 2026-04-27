# EternalNotes

An Obsidian-like local study workspace with Markdown notes, SQLite persistence, and source-grounded RAG study tools.

The app is local-first for development, but the schema and service boundaries are user-scoped so it can move toward hosted multi-user deployment without rewriting the core data model.

## What Works Now

- Three-pane workspace: vault sidebar, note editor/preview, and study tools panel.
- Dedicated `/account` area for profile, AI setup, hosted plans, security, and backups.
- Dedicated billing section under `/account` with plan state, billing identity, and hosted usage.
- Dedicated admin section under `/account` for instance controls, user management, and audit logs.
- Real Markdown note CRUD with SQLite persistence.
- Email/password authentication with secure HTTP-only session cookies.
- Optional email verification with a one-time code before first login.
- Rate-limited auth endpoints for login, registration, and password change.
- Nested folders/classes with move, rename, delete, and drag/drop support.
- Browser-style note tabs, pinned notes, and recent notes.
- Split, write, and preview note views.
- Exact text search across saved notes.
- Resizable and hideable left/right panels.
- User-scoped database tables with real account ownership.
- Provider settings UI with masked OpenAI key display.
- Local API key storage under `data/secrets`, ignored by git.
- Free notes workspace for all users, with BYOK or hosted AI plan selection in Settings.
- Hosted AI monthly usage tracking for ask, quiz, flashcards, summary, OCR, and indexing.
- Billing scaffolding for future Stripe integration: billing profile, subscription state, and plan lifecycle records.
- Encrypted-at-rest personal API key storage using a local encryption secret.
- Runtime instance settings for self-signup, hosted AI availability, and email verification.
- Command palette for quick navigation and workspace actions.
- Import modes for single-note import or split-by-heading import.
- Recent study activity history.
- Note chunking with note title and heading context.
- Embedding/index data stored locally in SQLite.
- Reindex flow that skips unchanged notes when content hashes match and removes stale/orphaned chunks.
- Ask-from-notes responses with citations/source excerpts.
- Source actions that open the note and temporarily highlight the matching excerpt.
- Quiz grading that compares the typed answer against the asked question, expected answer, and source excerpt.
- Single-item quiz flow: one generated question at a time.
- Single-item flashcard flow: one generated flashcard at a time.
- Searchable scope pickers for study tools and the right sidebar.
- Extractive summaries generated from indexed excerpts.
- Document import for DOCX, text, Markdown, and image files.
- OCR for screenshots and embedded DOCX images using the configured vision model.
- Password change inside Settings.
- Database backup export from the account area.
- Offline fallback retrieval using deterministic local vectors when no OpenAI key is configured.

## Grounding Rule

Notes are the source of truth. The answer prompt instructs the model to:

- answer only from provided notes
- avoid outside knowledge
- avoid guessing
- avoid debugging or prescribing fixes unless notes say so
- refuse when the retrieved excerpts do not support an answer

The UI always shows source excerpts for answers and study artifacts. Study generation and grading are grounded in stored note content, not external facts.

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

Set at least:

- `AUTH_SESSION_SECRET`
- `ALLOW_SELF_SIGNUP=true` or `false`
- `PERSONAL_API_KEY_SECRET`
- `OWNER_EMAIL=discordboteternal@gmail.com`

Optional owner/admin setup:

- `HOSTED_AI_ENABLED=true` or `false`

For email verification:

- `RESEND_API_KEY`
- `EMAIL_FROM`
- `EMAIL_VERIFICATION_REQUIRED=false|true`

For local testing without email delivery:

- `EMAIL_VERIFICATION_DEV_MODE=true`

Notes remain free without any AI key. Users can then either:

- enter their own OpenAI key in Settings for BYOK AI
- use a hosted AI plan if the server has `HOSTED_OPENAI_API_KEY` configured

## Home Server Deployment

For a 24/7 home machine deployment:

1. Install dependencies and build:

```bash
npm install
npm run build
```

2. Set your production config in `.env.local`:

```bash
AUTH_SESSION_SECRET=replace-this-with-a-long-random-secret
ALLOW_SELF_SIGNUP=true
OWNER_EMAIL=discordboteternal@gmail.com
HOSTED_AI_ENABLED=true
PERSONAL_API_KEY_SECRET=replace-this-too
RESEND_API_KEY=
EMAIL_FROM=
EMAIL_REPLY_TO=
EMAIL_VERIFICATION_DEV_MODE=false
EMAIL_VERIFICATION_REQUIRED=false
OPENAI_API_KEY=
OPENAI_PROJECT_ID=
HOSTED_OPENAI_API_KEY=
HOSTED_OPENAI_PROJECT_ID=
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_ANSWER_MODEL=gpt-4o-mini
OPENAI_VISION_MODEL=gpt-4o-mini
```

3. Start the app:

```bash
npm run start
```

4. Put it behind HTTPS before exposing it outside your network.
5. Back up both:

- `data/study.db`
- `data/secrets/`

The in-app backup export downloads the database only. Secret files still need filesystem backup.

Hosted AI notes:

- leave `HOSTED_OPENAI_API_KEY` empty if you want strict BYOK-only operation
- set `HOSTED_OPENAI_API_KEY` if you want to offer paid hosted AI plans on your own key
- hosted AI quotas are enforced per user, per month
- regular users need owner approval before they can consume the server-managed key
- BYOK usage does not consume hosted quota

Email verification notes:

- new accounts only verify email if `EMAIL_VERIFICATION_REQUIRED=true`
- codes expire after 15 minutes
- resend and verify attempts are rate limited
- in local development, `EMAIL_VERIFICATION_DEV_MODE=true` exposes the code in the auth UI if no mail provider is configured

## Recommended Settings

For the full feature set, configure these in Settings:

- `answer model`: used for grounded answers and study prompt generation
- `embedding model`: used for indexing and retrieval
- `vision model`: used for OCR on screenshots and embedded DOCX images
- `hosted AI plan`: `free`, `starter`, or `pro`

Without an API key:

- Ask falls back to extractive/local evidence output
- quiz grading falls back to a conservative heuristic
- quiz/flashcard generation falls back to a simpler local prompt builder
- image OCR is not available

With a personal API key:

- AI runs on the user's own provider account
- hosted AI quota is not consumed

With a hosted AI plan and a configured server hosted key:

- AI runs on the server-managed provider key
- monthly quota is consumed for supported features

## AI Access Model

EternalNotes separates the free notes product from AI cost exposure:

- notes, folders, editing, preview, search, organization, and local persistence are free
- AI can run in BYOK mode or hosted-plan mode

Product surface split:

- `/` keeps the study workspace focused on notes and revision tools
- `/account` handles profile, AI setup, hosted plan selection, usage, security, and backups
- `/account` also contains billing identity and subscription scaffolding for future checkout integration
- `/account` admin contains runtime settings, user management, and local audit logs when signed in as owner/admin

Priority order for AI access:

1. personal user API key
2. hosted server API key plus an active hosted plan
3. local fallback behavior where supported

Hosted plan quotas are tracked per user, per month.

Current billing implementation:

- billing contact details are stored per user
- subscription state is stored locally
- hosted plan changes are persisted through the billing layer
- no checkout, invoices, or payment provider are connected yet

Current admin/runtime implementation:

- owner/admin users can toggle self signup
- owner/admin users can disable hosted AI globally
- owner/admin users can enable or disable email verification
- owner/admin users can manually manage user roles, hosted plans, and account disable/delete
- recent local audit logs are stored in SQLite

Current hosted plan quotas:

### Free

- no hosted AI quota
- full notes workspace
- users can still use AI with their own API key

### Starter

- Ask: `200`
- Quiz generation: `100`
- Flashcard generation: `100`
- Summary generation: `100`
- OCR imports: `50`
- Index/reindex runs: `75`

### Pro

- Ask: `600`
- Quiz generation: `300`
- Flashcard generation: `300`
- Summary generation: `300`
- OCR imports: `150`
- Index/reindex runs: `200`

Quiz answer checking is intentionally not billed against hosted quota. It uses the user's own key when available, otherwise a local grading heuristic.

## Import and OCR

The import modal supports:

- `.docx`
- `.txt`
- `.md`
- `.markdown`
- `.text`
- image files such as `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.bmp`, `.tif`, `.tiff`

Behavior:

- plain text and Markdown are cleaned and imported into a note
- DOCX text is converted to Markdown
- DOCX embedded images are OCR'd and appended as labeled sections
- uploaded screenshots/images are OCR'd and imported into a note
- OCR output is stored in the note so retrieval stays grounded in saved content

## Study Tools

### Ask

- retrieves indexed chunks from the selected scope
- answers only from retrieved note excerpts
- refuses unsupported questions instead of guessing
- shows citations and exact source excerpts
- if the direct answer is unsupported, shows closest related note evidence

### Quiz

- generates one question at a time from the selected scope
- lets the user type an answer
- grades against the question, expected answer, and source excerpt
- accepts equivalent wording when it matches the source meaning
- includes a direct source link back to the note

### Flashcards

- generates one flashcard at a time from the selected scope
- shows the prompt first
- reveals the source-backed answer on demand
- includes a direct source link back to the note

### Summary

- produces extractive summaries from saved note excerpts
- keeps the note text as the factual source

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

## Self-Hosting Notes

This build is now suitable for running continuously on your own machine behind your own network setup.

Current self-hosting posture:

- real account login/logout
- per-user notes, folders, chunks, and settings
- secure session cookies
- rate-limited auth routes
- local SQLite database for single-machine deployment

Why SQLite is still used here:

- you are running this on one home computer, not scaling across multiple app servers
- it keeps the operational setup much simpler
- the schema remains user-scoped and can still be migrated later if you move to Postgres

## Architecture

- `app/api/*`: Next.js API routes
- `components/workspace.tsx`: main app workspace
- `components/document-import-modal.tsx`: import and OCR UI
- `lib/db.ts`: SQLite connection and migrations
- `lib/auth.ts`: password auth, session cookies, and auth guards
- `lib/services/*`: user-scoped notes, folders, and provider settings services
- `lib/rag/*`: chunking, embeddings, indexing, retrieval, answers, grading, and study tools

Core tables include:

- `users`
- `folders`
- `notes`
- `chunks`
- `provider_settings`
- `billing_profiles`
- `subscriptions`
- `app_settings`
- `audit_logs`
- `study_activity`
- `sessions`
- `ai_usage`
- `flashcards`
- `quiz_attempts`

Tables that hold private user data include `user_id`, and service methods require a user ID.

## Security Notes

This is now a self-hostable local deployment baseline, not a full hosted SaaS security implementation.

Implemented now:

- `.env*`, local databases, and secret files are ignored
- password-based login with HTTP-only session cookies
- email verification required before first login
- rate limiting on login, registration, and password change
- rate limiting on email verification and resend routes
- API routes do not return full API keys
- Settings UI masks stored keys
- personal API keys are encrypted at rest before being written to local secret files
- Notes, chunks, and settings are scoped by `user_id`
- Hosted AI usage is counted per user and bounded by plan limits
- Billing identity and subscription state are stored separately from provider settings
- OpenAI answer generation receives only retrieved note excerpts
- OCR output is stored in notes before it becomes retrievable

Before hosted deployment:

- replace local key files with encrypted per-user secret storage
- add authorization middleware for every route
- add rate limiting and audit logging
- use managed Postgres or another production database
- consider pgvector, LanceDB, or a hosted vector store for scalable retrieval
- add backups, data export, and account deletion workflows

## Current Limitations

- Local API key storage is not suitable for hosted production.
- Markdown preview supports common headings, lists, code blocks, bold, and inline code, not the full Obsidian syntax surface.
- Study prompt quality still depends on the quality and structure of the indexed note excerpt.
- Repetition in quiz/flashcard generation is reduced, but very short or highly repetitive notes can still produce similar prompts.
- SQLite is the right fit for a single self-hosted machine, but Postgres is still the better target if you later move to a public multi-user internet-facing deployment.
- The in-app backup export does not include `data/secrets`; back those up separately.
- Learning outcomes and spaced repetition history are not implemented yet.
- Billing is scaffolded only. There is no Stripe checkout, webhook sync, payment method storage, or invoice handling yet.
- Production email verification requires a configured mail provider. The local debug-code mode is for development only.
- Audit logging is local and lightweight. It is useful for self-hosting, but it is not a full security monitoring system.
