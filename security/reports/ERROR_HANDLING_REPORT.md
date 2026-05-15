# Error Handling Security Report

## Status: MEDIUM

## Findings

### FINDING 1 — MEDIUM: Generic catch blocks forward raw error messages to clients

**Pattern:** `error instanceof Error ? error.message : "fallback"`

This pattern is used as the final catch-all in ~12 API routes. Because `instanceof Error` matches any Error subclass — including SQLite constraint errors, filesystem errors, or library exceptions — an unexpected internal error will leak its raw `.message` to the HTTP response.

**Affected routes (data manipulation — DB errors are plausible):**

| File | Line(s) | Sample leak |
|------|---------|-------------|
| `app/api/notes/[id]/shares/route.ts` | 20, 33 | SQLite UNIQUE constraint from `shareNote()` |
| `app/api/notes/[id]/shares/[userId]/route.ts` | 20, 32 | SQLite errors from update/delete |
| `app/api/folders/[id]/route.ts` | 16 | SQLite errors from folder update |
| `app/api/tags/route.ts` | 26 | SQLite UNIQUE from duplicate tag name |
| `app/api/convert/route.ts` | 426 | mammoth/pdf-parse internal error text |
| `app/api/ask/explain/route.ts` | 30 | AI provider error details |
| `app/api/index/route.ts` | 25 | DB or embedding errors |
| `app/api/format/route.ts` | 44 | AI provider error details |

**Practical leakage example:** `SQLITE_CONSTRAINT: UNIQUE constraint failed: tags.user_id, tags.name` reveals DB schema.

**Auth routes** (`login`, `register`, `verify-email`, `change-password`, `resend-verification`) use the same pattern but those routes explicitly check controlled custom error types first (AuthError, RateLimitError, ZodError) before the fallback. The risk is lower since those functions are carefully written, but still non-zero.

### FINDING 2 — PASS: Custom error classes have developer-controlled messages

`RateLimitError`, `AuthError`, `VerificationRequiredError`, `QuotaExceededError`, `ProPlanRequiredError` all produce hardcoded template strings — not raw exception text. Returning `.message` from these is intentional and safe.

### FINDING 3 — PASS: Webhook and payment routes return generic messages

`app/api/billing/webhook/route.ts` returns `"Invalid signature"` / `"Webhook not configured"` — no internal details exposed.

## What's at risk

An attacker can cause specific operations to fail (e.g., by sending a duplicate tag name) and observe the SQLite error message in the 400/500 response. This leaks DB column names and constraint names. No code execution risk.

## What's already secure

- Custom typed errors (RateLimitError etc.) are safe to forward
- Auth flows are the highest-risk area and those already have explicit typed checks
- All routes require authentication before reaching the leaky catch blocks

## Recommendations

1. **[MEDIUM — Fix]** In data manipulation routes, replace `error instanceof Error ? error.message : "X"` with just `"X"` (the hardcoded fallback). Log the actual error server-side.
