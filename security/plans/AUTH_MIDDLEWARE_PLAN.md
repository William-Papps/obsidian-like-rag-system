# Auth Middleware Fix Plan

## Changes

None required. All routes are correctly protected.

## Verification goals

- [ ] Every route that returns user data calls `withAuthenticatedUser` or has an explicit `if (!user) return 401` guard
- [ ] Unauthenticated request to any protected route returns 401
- [ ] Non-admin request to `/api/admin` returns 403

## Manual verification (for the human)

- `curl -X GET http://localhost:3000/api/notes` (no cookie) → should return 401
- `curl -X GET http://localhost:3000/api/admin` (no cookie) → should return 401
- `curl -X GET http://localhost:3000/api/health` → should return 200
