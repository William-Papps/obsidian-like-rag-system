# CSRF Security Report

## Status: LOW

## Findings

### Session cookie: SameSite=lax

**File:** `lib/auth.ts`
```typescript
response.cookies.set(SESSION_COOKIE, session.token, {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  expires: new Date(session.expiresAt)
});
```

`SameSite=lax` means the session cookie is **not sent** on cross-origin POST/PATCH/DELETE requests. An attacker's page cannot trigger a mutation via a cross-site fetch because the browser will not attach the cookie.

`SameSite=lax` does send the cookie on cross-origin top-level GET navigations (clicking links), but all GET endpoints in this app are read-only, making this safe.

### JSON-only API — no form submission attack surface

All mutation endpoints parse `request.json()`. A classic cross-site form POST sends `application/x-www-form-urlencoded`, which causes `request.json()` to fail with a parse error — no mutation happens.

A cross-site fetch with `Content-Type: application/json` triggers a browser CORS preflight OPTIONS request. Since the app has no CORS headers allowing any other origin, the browser blocks the actual request before it's sent.

### No CSRF tokens — acceptable given the above

With SameSite=lax cookies + JSON-only body parsing + no CORS wildcard, CSRF attacks cannot succeed. Explicit CSRF tokens would be redundant.

## What's at risk

In edge-case scenarios:
- Very old browsers that ignore SameSite cookies (pre-2019) could be vulnerable, but these represent a negligible fraction of traffic.
- If the `secure` flag is missing in development, cookies can be sent over HTTP — but development environments are not production.

## What's already secure

- SameSite=lax on session cookie blocks cross-site mutation requests
- JSON-only parsing blocks form-based CSRF
- No CORS headers means cross-origin preflight requests are blocked

## Recommendations

No critical changes required. Optional hardening:
1. **[LOW]** Change `sameSite: "lax"` to `"strict"` to be more conservative — this prevents the cookie from being sent even on cross-origin GET navigations (links), though this has no practical security impact given the GET endpoints are read-only.
