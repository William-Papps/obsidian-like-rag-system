# Secrets Exposure Security Report

## Status: HIGH

## Findings

### FINDING 1 — HIGH: Hardcoded fallback for session signing key
**File:** `lib/auth.ts:364`
```typescript
function sessionTokenHash(token: string) {
  return sha256(`${process.env.AUTH_SESSION_SECRET || "studyos-dev-session-secret"}:${token}`);
}
```
If `AUTH_SESSION_SECRET` is not set, every session token is signed with the publicly known string `"studyos-dev-session-secret"`. An attacker who knows this string can forge valid session tokens for any user ID.

### FINDING 2 — HIGH: Hardcoded fallback for encryption key
**File:** `lib/secrets.ts:23`
```typescript
function secretKey() {
  const source = process.env.PERSONAL_API_KEY_SECRET?.trim() || process.env.AUTH_SESSION_SECRET || "eternalnotes-dev-secret";
  return createHash("sha256").update(source).digest();
}
```
If neither `PERSONAL_API_KEY_SECRET` nor `AUTH_SESSION_SECRET` is set, all stored user API keys are encrypted with the publicly known string `"eternalnotes-dev-secret"`. Any encrypted API key in the DB is trivially decryptable.

### FINDING 3 — LOW: .env.example placeholder values
**File:** `.env.example`
```
AUTH_SESSION_SECRET=change-me-for-production
PERSONAL_API_KEY_SECRET=change-me-too
```
Short, predictable placeholder values. Not a direct threat (env.example is not loaded at runtime), but a deployer who copies this file without changing values would be vulnerable.

### FINDING 4 — PASS: Discord IDs hardcoded
**File:** `lib/discord.ts:2-3`, `scripts/register-discord-commands.mjs:9`
```typescript
export const DISCORD_APP_ID = "1495923252470480956";
export const DISCORD_VERIFIED_ROLE_ID = "1504783987736969328";
```
Discord Application IDs and Role IDs are public identifiers by design. Not a security concern.

### FINDING 5 — PASS: .gitignore correctly excludes secrets
`.gitignore` excludes `.env`, `.env.local`, `.env.*.local`. Verified with `git ls-files .env` — no secret files tracked.

### FINDING 6 — PASS: No hardcoded API keys in source
Searched all source files for `sk_live_`, `sk_test_`, `AKIA`, `whsec_`, `rk_live_`, hardcoded Bearer tokens. None found. All secrets are consumed via `process.env.*`.

### FINDING 7 — PASS: .env.demo is clearly labeled
`.env.demo` uses `demo-only-not-for-production-replace-before-real-use` with a prominent warning banner note. Appropriate for its purpose.

### FINDING 8 — PASS: No NEXT_PUBLIC_ vars hold secrets
Only `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `NEXT_PUBLIC_APP_URL` use the public prefix. Both are legitimately public values.

## What's at risk

If `AUTH_SESSION_SECRET` is not set in production (or was never set):
- An attacker who knows `"studyos-dev-session-secret"` (now public via this audit) can construct a valid HMAC for any user ID and forge a session token, gaining access to any account including owner/admin.
- All encrypted API keys in the database can be decrypted using the known `"eternalnotes-dev-secret"` key.

## What's already secure

- All actual secrets consumed from `process.env` — no hardcoded keys, tokens, or passwords in source
- `.gitignore` correctly protects env files
- No AWS/Stripe/Resend credentials in source
- NEXT_PUBLIC_ vars contain only truly public values
- `.env.demo` is well-labeled and used only for Docker demo mode

## Recommendations

1. **[HIGH — FIXED]** Removed fallback strings from `lib/auth.ts` and `lib/secrets.ts`. Server now throws with a clear message if required env vars are missing.
2. **[LOW — FIXED]** Replaced `.env.example` placeholder values with blank fields and `openssl rand -hex 32` instructions.

## Verification Results

- ✅ `grep` for removed strings returns nothing
- ✅ `git ls-files .env` returns nothing
- ✅ Only `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_TURNSTILE_SITE_KEY` use public prefix — both legitimately public
