# Secrets Exposure Fix Plan

## Changes

- `lib/auth.ts` — Remove `|| "studyos-dev-session-secret"` fallback; throw an explicit error if `AUTH_SESSION_SECRET` is not set so the server refuses to start insecurely.
- `lib/secrets.ts` — Remove `|| "eternalnotes-dev-secret"` fallback; throw if neither secret env var is set.
- `.env.example` — Replace `change-me-for-production` / `change-me-too` with clearly instructional placeholders.

## New files

None.

## Verification goals

- [ ] `AUTH_SESSION_SECRET` not set → `sessionTokenHash()` throws, server startup fails with a clear message
- [ ] `PERSONAL_API_KEY_SECRET` not set AND `AUTH_SESSION_SECRET` not set → `secretKey()` throws
- [ ] `grep -rn "studyos-dev-session-secret\|eternalnotes-dev-secret" lib/` returns nothing
- [ ] `git ls-files .env` returns nothing
- [ ] `grep -rn "NEXT_PUBLIC_" app/ components/ lib/` shows only TURNSTILE_SITE_KEY and APP_URL

## Manual verification (for the human)

- Confirm `AUTH_SESSION_SECRET` is set in your production `.env.local` — run `grep AUTH_SESSION_SECRET .env.local` on the server
- Confirm `PERSONAL_API_KEY_SECRET` is set — run `grep PERSONAL_API_KEY_SECRET .env.local`
- If either was previously unset (using the weak defaults), rotate all active sessions by changing `AUTH_SESSION_SECRET` to a new random value (`openssl rand -hex 32`), which invalidates all existing session tokens
