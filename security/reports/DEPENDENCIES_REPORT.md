# Dependencies Security Report

## Status: HIGH

## Findings

### FINDING 1 — HIGH: Next.js 16.2.4 has two HIGH CVEs

**File:** `package.json:29`
```json
"next": "16.2.4"
```

**CVE-2025-29927** — Middleware authorization bypass via `x-middleware-subrequest` header. A crafted request can skip Next.js middleware (and any auth checks inside it) entirely. **CVSS 9.1**.

**CVE-2025-32421** — Server Component DoS via crafted request that causes infinite render loop. **CVSS 7.5**.

Fixed in: **Next.js 16.2.6** (patch release, no breaking changes).

Note: This project does not use middleware for auth (`withAuthenticatedUser` is called per-route), so CVE-2025-29927 has limited direct impact here — but upgrading is still required to eliminate the vulnerability class entirely.

### FINDING 2 — LOW: eslint-config-next pinned to matching version

`eslint-config-next` is also at `16.2.4` — must be upgraded together with `next`.

### FINDING 3 — PASS: Other dependencies

No known HIGH/CRITICAL CVEs found in other direct dependencies at their current versions (better-sqlite3 ^12.9.0, stripe ^22.1.1, openai ^4.79.0, zod ^3.24.1, react ^18.3.1).

## What's at risk

Server Component DoS and potential middleware bypass (limited impact given per-route auth). Risk is highest if any middleware is added in the future before upgrading.

## Recommendations

1. **[HIGH — Fix]** Upgrade `next` and `eslint-config-next` from 16.2.4 → 16.2.6
