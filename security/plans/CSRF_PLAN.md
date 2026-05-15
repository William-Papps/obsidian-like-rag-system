# CSRF Fix Plan

## Changes

- `lib/auth.ts` — Change `sameSite: "lax"` to `"strict"` for defense-in-depth

## Verification goals

- [ ] Session cookie has SameSite=Strict attribute (visible in DevTools → Application → Cookies)
- [ ] Cross-origin POST to any mutation endpoint without credentials returns 401 (cookie not sent)

## Manual verification (for the human)

- Log in → DevTools → Application → Cookies → confirm `SameSite: Strict`
