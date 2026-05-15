# Security Headers Report

## Status: MEDIUM

## Findings

### Present headers (via next.config.mjs, applied globally to `/(.*)`):
- ✅ `X-Frame-Options: DENY` — prevents clickjacking
- ✅ `X-Content-Type-Options: nosniff` — prevents MIME sniffing
- ✅ `Referrer-Policy: strict-origin-when-cross-origin` — safe referrer control
- ✅ `Permissions-Policy: camera=(), microphone=(self), geolocation=()` — permission restrictions
- ⚠️ `X-XSS-Protection: 1; mode=block` — legacy header, ignored by modern browsers

### Missing headers:

**`Strict-Transport-Security` (HSTS) — MEDIUM**
Without HSTS, a user who navigates to `http://` before `https://` can be downgraded by a man-in-the-middle attacker. Once set, the browser will always use HTTPS for the domain.

**`Content-Security-Policy` (CSP) — MEDIUM**
No CSP defined. Without CSP, if XSS were ever introduced, it could execute arbitrary scripts. The markdown renderer is well-hardened, but defense-in-depth is valuable.

## What's at risk

- Without HSTS: first-load HTTP downgrade attacks (mitigated if DNS redirects HTTP to HTTPS at the server level, which is common)
- Without CSP: XSS attacks have no browser-level fallback protection

## What's already secure

Three of the five required headers are present and correctly set. Applied globally via `next.config.mjs`.

## Recommendations

1. **[MEDIUM — Fix]** Add `Strict-Transport-Security: max-age=63072000; includeSubDomains` to `next.config.mjs`
2. **[MEDIUM — Fix]** Add a Content-Security-Policy. The app uses Tailwind (inline styles), CodeMirror, KaTeX, and Cloudflare Turnstile (cross-origin script) — these need careful CSP directives.
