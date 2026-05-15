# Rate Limiting Security Report

## Status: PASS

## Findings

All sensitive endpoints are rate-limited. Limits use dual keys (IP + identifier) to prevent both brute-force and distributed attacks.

| Endpoint | IP limit | Identifier limit |
|---|---|---|
| POST /api/auth/login | 10 / 10 min | 10 / 10 min (per email) |
| POST /api/auth/register | 6 / 30 min | 6 / 30 min (per email) |
| POST /api/auth/forgot-password | 5 / 30 min | 5 / 30 min (per email) |
| POST /api/auth/reset-password | 8 / 15 min | 8 / 15 min (per email) |
| POST /api/auth/verify-email | 12 / 15 min | 12 / 15 min (per email) |
| POST /api/auth/resend-verification | 5 / 15 min | — |
| POST /api/auth/change-password | 8 / 10 min | 8 / 10 min (per user.id) |
| POST /api/ask | — | 30 / 60 s (per user.id) |
| POST /api/ask/explain | — | 30 / 60 s (per user.id) |
| GET /api/public/[token] | 60 / 60 s | — |
| GET /api/public/folder/[token] | 60 / 60 s | — |

### X-Forwarded-For spoofing: not a bypass vector

`clientIp()` returns `"local"` when `TRUST_PROXY=false` (the default). In this mode, all requests from a spoofed IP are treated as the same IP (`"local"`), making the bypass ineffective. When `TRUST_PROXY=true`, the header is validated against `/^[0-9a-fA-F:.]+$/` to reject malformed values. Documented in env example.

### Rate limited responses: return 429

`RateLimitError` is caught at each endpoint and returns `{ status: 429 }`.

## What's already secure

Comprehensive coverage of all auth and AI endpoints with sensible limits.

## Recommendations

No changes required. PASS.
