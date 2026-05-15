# Frontend Secrets Fix Plan

## Changes

None required.

## Verification goals

- [ ] `grep -rn "NEXT_PUBLIC_" components/ app/ lib/` shows only TURNSTILE_SITE_KEY and APP_URL
- [ ] No `import openai` or `import Stripe` in any "use client" file
- [ ] No API keys in localStorage (open DevTools → Application → Local Storage)

## Manual verification (for the human)

- Open DevTools → Network → filter by XHR/Fetch while performing an AI query → confirm all requests go to `/api/*`, not directly to `api.openai.com`
- Open DevTools → Application → Local Storage → confirm no API keys stored
