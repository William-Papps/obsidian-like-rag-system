# EternalNotes — Project Memory

Before doing any task, read this file and follow it as the source of truth.
Use gstack roles where useful, but do not over-engineer.

For each task:
1. Inspect relevant files
2. Explain the plan
3. Make the smallest safe change
4. Run checks
5. Summarize exactly what changed

---

## What This Project Is

**EternalNotes** is an Obsidian-like local study workspace with Markdown notes, SQLite persistence, and source-grounded RAG study tools. It runs fully offline with Ollama or online with an OpenAI API key.

- Public repo: `https://github.com/William-Papps/obsidian-like-rag-system`
- Website / download: `https://eternalbot.net`
- Hosted instance: `https://notes.eternalbot.net`
- Owner email: `williampapps2@gmail.com`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) |
| Database | SQLite via `better-sqlite3` (native C++ addon) |
| Local AI | Ollama |
| Cloud AI | OpenAI API |
| Auth | Email/password, HTTP-only session cookies |
| Styling | Tailwind CSS |
| Deployment | Home PC (Windows), served via `npm run start` or Docker |

---

## Deployment

- The app runs on the owner's **home PC** (Windows, PowerShell 5.1).
- **Never use `&&` in PowerShell** — use two separate commands instead.
- Ollama runs locally on the same machine.
- The GitHub repo is public but the primary user path is through `eternalbot.net`.

### Required Ollama Models

| Model | Purpose |
|---|---|
| `nomic-embed-text` | Note indexing and retrieval (required) |
| `llama3.2:3b` | Ask, Quiz, Flashcards, Briefing (required) |
| `moondream` | OCR for images and DOCX embedded images (optional) |

If a model is missing, the app now surfaces a clear "run `ollama pull <model>`" message instead of a raw 404 error.

---

## Pricing

| Plan | Price | AI Access |
|---|---|---|
| Personal | $0/month | BYOK (OpenAI key in Settings) |
| Pro | $12/month | Hosted AI, no key needed |

### Pro Quotas (per month)

- Ask: 1500
- Knowledge Checks: 600
- Training Cards: 600
- Briefings: 600
- OCR scans: 200
- Index/reindex runs: 1000

Personal users have no hosted quota — they use their own API key. Ollama users are treated like BYOK (local compute, no server cost, no quota enforcement).

---

## Architecture

```
app/api/*          — Next.js API routes
components/
  workspace.tsx    — Main three-pane study workspace
  account-page.tsx — /account area (profile, AI, billing, admin)
lib/
  db.ts            — SQLite connection and migrations
  auth.ts          — Password auth, session cookies, auth guards
  services/
    ai-access.ts   — resolveAiContext(), requireProAccess()
    quotas.ts      — consumeQuota(), recordUsage(), PLAN_LIMITS
    billing.ts     — Subscription state
    users.ts       — User management
  rag/
    answer.ts      — Ask streaming + non-streaming answer
    study.ts       — Quiz, Flashcard, Summary generation
    indexing.ts    — Note chunking and embedding
    retrieval.ts   — Vector similarity search
    embeddings.ts  — embedText(), embedBatch(), localEmbedding()
  import/
    vision.ts      — OCR via Ollama moondream or OpenAI vision
```

### Core Database Tables

`users`, `folders`, `notes`, `chunks`, `provider_settings`, `billing_profiles`, `subscriptions`, `app_settings`, `audit_logs`, `study_activity`, `sessions`, `ai_usage`, `flashcards`, `quiz_attempts`

---

## AI Access Priority

1. Personal API key (BYOK) — user entered in Account → AI Settings
2. Hosted server key + active Pro plan
3. Ollama (if `OLLAMA_BASE_URL` is set)
4. Local fallback (TF-IDF / extractive, no generation)

---

## Key Decisions and Known Behaviours

- **Usage tracking**: `consumeQuota()` enforces hosted limits; `recordUsage()` records without enforcing. Both must be called appropriately so the admin dashboard shows all users, not just hosted plan users.
- **Ollama users pass `requireProAccess`** because they use local compute — no server cost.
- **`better-sqlite3`** is a native addon; it must be compiled for the target platform. The Docker build uses a multi-stage build to compile it on `linux/amd64`.
- **`mammoth` DOCX import** requires `{ buffer: Buffer }` input, not `{ arrayBuffer }`. Images inside DOCX use `image.read()` not `image.readAsBuffer()`.
- **Sidebar rows** use a fixed 32px right slot with count↔kebab hover swap. No absolute positioning, no `group-hover:pr-*` hacks. All folder/note actions go through `VaultContextMenu` (right-click).
- **Ollama model names**: use `llama3.2:3b` (with tag), not `llama3.2`. These are different identifiers.
- **`DEMO_MODE=true`** shows an amber warning banner (via `DemoBanner` component in layout). Set `DEMO_MODE=false` for production.

---

## Environment Variables (key ones)

```
AUTH_SESSION_SECRET        — Required, 64+ random chars
PERSONAL_API_KEY_SECRET    — Required, 64+ random chars
ALLOW_SELF_SIGNUP          — true | false
OWNER_EMAIL                — Sets the owner account
OLLAMA_BASE_URL            — e.g. http://localhost:11434
HOSTED_AI_ENABLED          — true | false
HOSTED_OPENAI_API_KEY      — Server-managed key for Pro plan users
DEMO_MODE                  — true shows the warning banner
```

---

## Current Status

- Beta testing with real users via `notes.eternalbot.net`
- Core features working: notes, folders, Ask, Quiz, Flashcards, Briefing, OCR, DOCX import, PDF import
- Admin dashboard shows usage for all AI modes (Ollama, BYOK, hosted)
- Pricing aligned: Personal ($0 BYOK) and Pro ($12/mo hosted)
- Discord: `https://discord.gg/6hhxtpzkAE`
