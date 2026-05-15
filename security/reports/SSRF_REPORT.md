# SSRF Security Report

## Status: PASS

## Findings

No user-supplied URL fetching exists in the codebase.

Every `fetch()` call uses either a hardcoded URL or an environment variable:
- `lib/email.ts` — `"https://api.resend.com/emails"` (hardcoded)
- `lib/discord.ts` — `"https://discord.com/api/v10/..."` (hardcoded)
- `app/api/auth/register/route.ts` — `"https://challenges.cloudflare.com/..."` (hardcoded)
- `app/api/health/route.ts` — `${process.env.OLLAMA_BASE_URL}/api/tags` (env var, admin-controlled)

Users cannot supply a URL that the server would fetch. No SSRF surface exists.

## What's already secure

All outbound HTTP calls target hardcoded third-party service endpoints or admin-configured env vars.

## Recommendations

No changes required. PASS.
