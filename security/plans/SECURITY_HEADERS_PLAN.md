# Security Headers Fix Plan

## Changes

- `next.config.mjs` — add HSTS and CSP headers to the global headers() array

## Verification goals

- [ ] `Strict-Transport-Security` header present on all responses
- [ ] `Content-Security-Policy` header present on all responses
- [ ] All five required headers present: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- [ ] App still works after CSP is applied (no blocked scripts/styles in browser console)

## Manual verification (for the human)

- Open DevTools → Network → click any request → Response Headers → confirm all 5 headers are present
- Open DevTools → Console → confirm no CSP violation warnings after loading the workspace, editor, and auth pages
- Test Turnstile on the signup page — it loads from `challenges.cloudflare.com` and needs to be allowed in CSP
