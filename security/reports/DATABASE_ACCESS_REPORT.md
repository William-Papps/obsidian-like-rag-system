# Database Access Security Report

## Status: PASS

## Findings

This is a Next.js app with a local SQLite database (better-sqlite3). RLS is not applicable (no Supabase/Firebase). The equivalent protection layer is `withAuthenticatedUser()` enforced at the API route level.

### All 62 authenticated routes properly gate DB access

`withAuthenticatedUser()` is called before any `dbGet`/`dbRun`/`dbAll` in every protected handler. Admin routes additionally call `isAdmin(user)` and return 403 on failure.

### 2 intentionally public routes are read-only and token-gated

- `GET /api/public/[token]` — returns note by public_token (random 18-byte base64url, ~144-bit entropy)
- `GET /api/public/folder/[token]` — returns folder tree by token

Both are read-only. Token guessing is computationally infeasible.

### Auth/registration routes are rate-limited and use no auth by design

- `/api/auth/login` — 10 req / 10 min per IP + per email
- `/api/auth/register` — 6 req / 30 min per IP + per email
- `/api/auth/forgot-password`, `/api/auth/verify-email`, etc. — all rate-limited

### Session security

- Token stored as `sha256(AUTH_SESSION_SECRET + token)` — not the raw token
- Cookie: httpOnly, secure in production, sameSite=lax, 30-day TTL
- Disabled and unverified users blocked in `getCurrentUser()`

### Minor: No rate limiting on public share endpoints

`/api/public/[token]` and `/api/public/folder/[token]` have no rate limiting. A scraper with a large list of tokens could make unlimited requests. Low practical risk (tokens are random, no enumeration vector), but worth a rate limit.

## What's at risk

Nothing critical. The only gap is potential DoS via hammering public share endpoints — an attacker can't read data they don't have the token for, but they could increase server load.

## What's already secure

- Every protected route uses `withAuthenticatedUser()` before DB access
- Two-layer check: auth + role for admin routes
- All queries parameterized (no SQL injection)
- Session tokens stored as server-side hashes
- No DB access from client-side code
- Webhook endpoints (Stripe, Discord) verify signatures first

## Recommendations

1. **[LOW]** Add rate limiting to public share endpoints to prevent hammering.
