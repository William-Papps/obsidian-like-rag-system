# Auth Middleware Security Report

## Status: PASS

## Findings

### No centralized middleware.ts — all routes enforce auth inline

There is no Next.js `middleware.ts`. Every route independently calls `withAuthenticatedUser()` (or `getCurrentUserOptional()` with an explicit early-return null check) before any DB access or user-data response. This is the correct pattern for a Next.js App Router project.

### All 67 routes audited — categorized correctly

**Properly protected (requires valid session):** 54 routes  
All call `withAuthenticatedUser()` or `getCurrentUser()` as the first operation before any DB call.

**Admin-gated (requires valid session + admin/owner role):** 4 routes  
- `GET/PATCH/DELETE /api/admin` — `withAuthenticatedUser` + `isAdmin()` → 403 if not admin  
- `PATCH/DELETE /api/admin/users/[id]` — same  
- `GET /api/backup` — same  
- `GET /api/feedback` — admin-only read

**Public — intentionally unauthenticated:** 9 routes  
- `/api/health`, `/api/config` — no user data
- `/api/auth/login`, `/api/auth/register`, `/api/auth/forgot-password`, `/api/auth/reset-password`, `/api/auth/verify-email`, `/api/auth/resend-verification` — public by design, all rate-limited
- `GET /api/discord/verify` — token peek only, returns Discord username (not sensitive)

**Token-gated public reads:** 2 routes  
- `GET /api/public/[token]`, `GET /api/public/folder/[token]` — no auth, but token acts as a 144-bit password

**Signature-verified webhooks:** 2 routes  
- `POST /api/billing/webhook` — Stripe signature  
- `POST /api/discord/interactions` — Ed25519 Discord signature

### images/[id] false positive — correctly implemented

```typescript
const user = await getCurrentUserOptional();
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
// TypeScript narrows user to non-null here — safe
if (!row || row.user_id !== user.id) { ... }
```
Early return on line 16 correctly guards all subsequent `user.id` accesses.

## What's at risk

Nothing. All routes returning or modifying user data require a valid session.

## What's already secure

- Consistent `withAuthenticatedUser()` pattern across all 54 protected routes
- Two-layer auth + role check on all admin routes
- Rate limiting on every public auth endpoint
- Signature verification on both webhooks
- No route accidentally exposes data without session validation

## Recommendations

No changes required. PASS.
