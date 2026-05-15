# Database Access Fix Plan

## Changes

- `app/api/public/[token]/route.ts` — add rate limiting (10 req / min per IP) to the GET handler
- `app/api/public/folder/[token]/route.ts` — same rate limiting

## New files

None.

## Verification goals

- [ ] `GET /api/public/[token]` after 11 rapid requests returns 429
- [ ] Authenticated routes with no session still return 401
- [ ] Admin routes with non-admin session still return 403

## Manual verification (for the human)

- Confirm all existing note-sharing links still work after rate limit is added
- Test that a legitimate user sharing a public note can reload it multiple times within a minute without hitting the limit (10/min is generous for normal use)
