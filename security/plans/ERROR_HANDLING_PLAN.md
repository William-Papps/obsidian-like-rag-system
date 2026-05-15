# Error Handling Fix Plan

## Changes

Replace `error instanceof Error ? error.message : "fallback"` with just `"fallback"` in data manipulation routes. Log the actual error server-side before returning.

### Files to fix

- `app/api/notes/[id]/shares/route.ts` — lines 20, 33
- `app/api/notes/[id]/shares/[userId]/route.ts` — lines 20, 32
- `app/api/folders/[id]/route.ts` — line 16
- `app/api/tags/route.ts` — line 26
- `app/api/convert/route.ts` — line 426

**Out of scope (intentional or lower risk):**
- Auth routes: already check typed custom errors first; fallback for unexpected exceptions is acceptable
- AI routes (`ask`, `format`, `index`): error messages intentionally surfaced to user for UX (AI failure feedback)

## Verification goals

- [ ] Triggering a SQLite UNIQUE constraint in the tags route returns `"Failed to create tag"`, not the SQLite error string
- [ ] The actual error is still logged to console (server-side visibility preserved)
