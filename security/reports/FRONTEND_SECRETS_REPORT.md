# Frontend Secrets Security Report

## Status: PASS

## Findings

### No secrets in client-side code

Audited all "use client" components and files that run in the browser. No third-party API keys, tokens, or credentials appear in any client-side file.

### NEXT_PUBLIC_ variables — only 2, both legitimately public

| Variable | Value held | Safe? |
|---|---|---|
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key (public by design) | ✅ |
| `NEXT_PUBLIC_APP_URL` | The app's own base URL | ✅ |

No secret keys, private keys, or credentials use the `NEXT_PUBLIC_` prefix.

### All third-party API calls are server-side

- **Stripe**: Client calls `/api/billing/checkout` (internal) → server creates Stripe session → client redirected to Stripe-hosted page. `STRIPE_SECRET_KEY` never leaves the server.
- **OpenAI**: Client calls `/api/ask` / `/api/ask/explain` (internal). `OPENAI_API_KEY` never in client code.
- **Resend**: Email sends happen in server API routes only. `RESEND_API_KEY` never in client code.
- **Discord**: `components/discord-verify-ui.tsx` calls only `/api/discord/verify` (internal).
- **Turnstile**: Site key (public) used client-side; secret key verified server-side only.

### next.config.mjs — no secret leakage

No `publicRuntimeConfig`, no `env:` block, no explicit env exports. Only the `NEXT_PUBLIC_` convention is used.

### localStorage — no secrets

Client code stores only user preferences (theme, pinned notes). No API keys or tokens in localStorage/sessionStorage.

## What's at risk

Nothing. No secrets are reachable from the browser.

## What's already secure

- Consistent server-proxy pattern: every sensitive operation goes through `/api/*` routes
- No Stripe publishable key in client code (checkout flow is fully server-initiated)
- No OpenAI direct calls from browser
- All `process.env.*` accesses for secrets are in server-side files only

## Recommendations

No changes required. PASS.
