# EternalNotes — Chat Context

> Paste this at the start of a new chat to restore full context.
> Full project reference: read `PROJECT_MEMORY.md` before any task.

---

## Project

**EternalNotes** — Obsidian-like RAG study workspace.
Next.js · SQLite (better-sqlite3) · Ollama (local AI) · OpenAI (cloud AI)

- Repo: `https://github.com/William-Papps/obsidian-like-rag-system`
- Live: `https://notes.eternalbot.net` · Marketing: `https://eternalbot.net`
- Deployed on owner's **home PC** (Windows, PowerShell 5.1 — never use `&&`)

### Required Ollama models
| Model | Purpose |
|---|---|
| `nomic-embed-text` | Indexing + retrieval |
| `llama3.2:3b` | Ask, Quiz, Flashcards, Briefing |
| `moondream` | OCR (optional) |

---

## Pricing (live)

| Plan | Price | AI |
|---|---|---|
| Personal | $0/mo | BYOK only |
| Pro | $12/mo | Hosted AI |

Pro quotas: 1500 Ask · 600 Knowledge Checks · 600 Training Cards · 600 Briefings · 200 OCR · 1000 index runs/month

---

## What Was Done This Session

### Bugs fixed
- **Ask feature ("404 model not found")** — Added `ollamaModelNotFound()` in `lib/rag/answer.ts` and `lib/rag/embeddings.ts`. Now surfaces "run: ollama pull <model>" instead of a raw 404.
- **DOCX import ("Could not find file in options")** — Fixed mammoth input from `{ arrayBuffer }` → `{ buffer }` and `image.readAsBuffer()` → `image.read()` in `app/api/convert/route.ts`.
- **Image import blocked for Ollama users** — `requireProAccess()` in `lib/services/ai-access.ts` now passes through when `OLLAMA_BASE_URL` is set (local compute = no server cost).
- **Admin usage showing zero** — Added `recordUsage()` to `lib/services/quotas.ts`. All AI features (Ask, Quiz, Flashcards, Indexing, OCR) now record usage for Ollama and BYOK users, not just hosted plan users.
- **vision.ts model-not-found** — Catches 404 from Ollama and returns a warning instead of throwing.

### Features added
- **AI structure detection on import** (`lib/import/structure.ts`) — Optional toggle in the import modal. Sends plain text through the answer model to detect headings, lists, and tables before saving. DOCX/PDF/images are skipped. Caps at 6000 chars for small models; remainder appended unchanged.

### UI / content updates
- **Pricing renamed** — "Free" → "Personal ($0/mo)", plan cards updated with correct Pro bullets (1500 Ask, 600 Knowledge Checks, 600 Training Cards, 600 Briefings, 200 OCR).
- **Admin plan labels** — "Free" → "Personal", "AI Starter" → "Pro", "AI Pro" → "Pro (legacy)".
- **Sidebar redesign** — FolderRow and NoteRow use a fixed 32px right slot: count/date at rest, kebab (⋮) on hover. No absolute positioning. All actions via `VaultContextMenu` (right-click).
- **Discord link** updated to `https://discord.gg/6hhxtpzkAE` across all legal pages.
- **README** — Added Docker quickstart, self-hosting sections, system requirements, team setup, production setup, troubleshooting link.
- **PROJECT_MEMORY.md** created in repo root — read it at the start of every task.

---

## Key File Map

```
app/api/convert/route.ts          Import: DOCX, PDF, images, text, AI structure
lib/import/structure.ts           AI structure detection (new this session)
lib/import/vision.ts              OCR via Ollama moondream or OpenAI
lib/rag/answer.ts                 Ask feature (streaming + non-streaming)
lib/rag/study.ts                  Quiz, Flashcard, Briefing generation
lib/rag/indexing.ts               Note chunking + embedding
lib/rag/embeddings.ts             embedText(), embedBatch(), localEmbedding()
lib/services/ai-access.ts         resolveAiContext(), requireProAccess()
lib/services/quotas.ts            consumeQuota(), recordUsage(), PLAN_LIMITS
components/workspace.tsx          Main three-pane workspace
components/account-page.tsx       /account — profile, AI, billing, admin
components/document-import-modal.tsx  Import modal (now has AI structure toggle)
```

---

## Current State

- Beta testing live at `notes.eternalbot.net`
- All core features working: notes, folders, Ask, Quiz, Flashcards, Briefing, OCR, DOCX, PDF, image import, AI structure detection
- Admin dashboard tracks usage for all AI modes (Ollama, BYOK, hosted)
- No known open bugs

---

## Workflow Rules

1. Read `PROJECT_MEMORY.md` before any task
2. Inspect relevant files
3. Explain the plan
4. Make the smallest safe change
5. Run `npx tsc --noEmit` to check types
6. Summarize exactly what changed
7. Commit and push when done
