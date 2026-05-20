# EternalNotes

An Obsidian-like local study workspace with Markdown notes, SQLite persistence, and source-grounded RAG study tools — runs fully offline with [Ollama](https://ollama.com).

No accounts required to try. No cloud. No telemetry. Your notes stay on your machine.

---

## What It Does

- **Markdown notes** with folders, tags, search, and version history
- **Ask AI** — retrieves indexed chunks from your notes, answers only from what you wrote (with source citations)
- **Knowledge Check** — generates one question at a time from your notes, grades your typed answer against the source
- **Training Cards** — flashcard-style review grounded in your note content
- **Briefing** — extractive summaries from indexed excerpts
- **Document import** — DOCX, PDF, plain text, Markdown, images (OCR via Ollama)
- **Multi-user** — one server, multiple accounts, per-user note vaults

All AI runs locally via Ollama. No OpenAI key required.

---

## Quick Start (Docker)

**Requirements:** Docker Desktop 4.x · 16 GB RAM · 15 GB free disk

```bash
git clone https://github.com/William-Papps/obsidian-like-rag-system.git
cd obsidian-like-rag-system
cp .env.demo .env
```

Open `.env` and set two secrets (use any long random strings — `openssl rand -hex 32` works):

```
AUTH_SESSION_SECRET=replace-with-a-long-random-string
PERSONAL_API_KEY_SECRET=replace-with-a-different-long-random-string
```

Also set `DEMO_MODE=false` once you've set real secrets (the app shows a warning banner while demo mode is on).

```bash
docker compose up -d
```

This starts Ollama, downloads three AI models (`nomic-embed-text`, `llama3.2:3b`, `moondream`), and starts the app. Model downloads are ~3–5 GB and only happen once.

Wait for models:

```bash
docker compose logs -f init-models
```

When all three models show as pulled, open `http://localhost:3000`, create an account, and start adding notes.

See [TROUBLESHOOT.md](TROUBLESHOOT.md) if anything doesn't work.

---

## Local Development (no Docker)

**Requirements:** Node.js 20+ · npm 10+ · [Ollama](https://ollama.com) running locally

```bash
git clone https://github.com/William-Papps/obsidian-like-rag-system.git
cd obsidian-like-rag-system
npm install
```

Pull the required Ollama models:

```bash
ollama pull nomic-embed-text
ollama pull llama3.2:3b
ollama pull moondream
```

Copy and configure the environment file:

```bash
cp .env.example .env.local
```

Open `.env.local` and set at minimum:

```
AUTH_SESSION_SECRET=any-long-random-string
PERSONAL_API_KEY_SECRET=any-different-long-random-string
OLLAMA_BASE_URL=http://localhost:11434
```

Start the dev server:

```bash
npm run dev
```

Open `http://localhost:3000`.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `AUTH_SESSION_SECRET` | Yes | Long random string for signing session cookies. Generate: `openssl rand -hex 32` |
| `PERSONAL_API_KEY_SECRET` | Yes | Long random string for encrypting stored API keys. |
| `OLLAMA_BASE_URL` | Yes | URL of your Ollama instance. Default: `http://localhost:11434` |
| `ALLOW_SELF_SIGNUP` | No | `true` (default) allows anyone to register. Set `false` to disable new signups. |
| `OWNER_EMAIL` | No | Email of the first/owner account. Gets admin privileges. |
| `EMAIL_VERIFICATION_REQUIRED` | No | `false` by default. Set `true` to require email verification on signup. |
| `RESEND_API_KEY` | No | Required only if `EMAIL_VERIFICATION_REQUIRED=true`. |
| `DEMO_MODE` | No | `true` shows a warning banner that secrets are temporary. Set `false` for production. |

---

## Required Ollama Models

| Model | Purpose |
|---|---|
| `nomic-embed-text` | Note indexing and chunk retrieval |
| `llama3.2:3b` | Ask, Quiz, Flashcards, Briefing |
| `moondream` | OCR for images and DOCX embedded images (optional) |

If a model is missing, the app surfaces a clear "run `ollama pull <model>`" message instead of a raw error.

---

## Where Notes Are Stored

All data lives in `data/` at the project root:

```
data/
  study.db        — SQLite database (notes, folders, chunks, sessions)
  study.db-wal    — WAL journal
  secrets/        — encrypted API keys (if any)
```

This directory is gitignored. Back it up to keep your notes safe. You can also export a database backup from **Account → Backups** inside the app.

---

## Adding Notes

- Click **New note** in the sidebar
- Or use **Import** (top toolbar) to import `.md`, `.txt`, `.docx`, or image files
- After adding notes, click **Index** in the study panel to embed them for AI retrieval
- Use **Ask** to query your notes once indexed

---

## System Requirements

| | Minimum | Recommended |
|---|---|---|
| RAM | 8 GB | 16 GB |
| Disk | 10 GB free | 15 GB free |
| Architecture | x86\_64/amd64 | x86\_64/amd64 |

Apple Silicon (M-series): add `platform: linux/amd64` under the `app:` service in `docker-compose.yml` and enable Rosetta in Docker Desktop Settings.

---

## Multi-User Setup

EternalNotes supports multiple accounts from a single server.

1. Host runs `docker compose up -d` on a machine reachable by the team
2. First account created becomes the owner (set `OWNER_EMAIL` to claim it)
3. Others visit the server URL and register their own accounts
4. Each user has a private note vault; workspaces allow selective sharing (via **Account → Workspaces**)

Set `ALLOW_SELF_SIGNUP=false` to stop open registration once your team is onboarded.

---

## Scripts

```bash
npm run dev        # start dev server
npm run build      # production build
npm run typecheck  # TypeScript check
npm run lint       # ESLint
```

---

## Tech Stack

- **Framework:** Next.js (App Router)
- **Database:** SQLite via `better-sqlite3`
- **AI:** Ollama (local)
- **Auth:** email/password, HTTP-only session cookies
- **Styling:** Tailwind CSS

---

## Limitations

- Requires Ollama for AI features; no cloud AI path in this build.
- SQLite is right for single-machine self-hosting. A Postgres migration would be needed for a multi-server deployment.
- Markdown preview supports common syntax but not the full Obsidian plugin surface.
- `better-sqlite3` is a native addon compiled for the host platform — the Docker image targets `linux/amd64`.

---

## License

MIT
