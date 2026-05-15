# File Uploads Security Report

## Status: LOW

## Findings

### FINDING 1 — LOW: Image type validated by client-supplied MIME type, not magic bytes

**File:** `app/api/images/route.ts:33`
```typescript
const ext = ALLOWED_TYPES[file.type]; // file.type comes from the client
if (!ext) return NextResponse.json({ error: "Unsupported image type" }, { status: 400 });
```

`file.type` is set by the browser/client in the multipart form Content-Type. A malicious client could claim `Content-Type: image/png` for a file containing arbitrary bytes.

**Practical impact:** LOW. Even if a non-image file passes the MIME check:
- It gets an image extension (`.png`, `.jpg`, `.gif`, `.webp`)
- It's served back with `Content-Type: image/png` (from the stored value)
- Browsers would treat it as a broken image, not execute it
- There's no server-side code execution of stored files
- Authentication required to upload and retrieve

### FINDING 2 — PASS: File rename, size limit, auth

- Files renamed to `{uuid}.{ext}` — no filename injection
- Size capped at 10 MB server-side
- `withAuthenticatedUser()` required to upload
- Ownership checked (`user_id`) before serving

### FINDING 3 — PASS: Documents route

`app/api/documents/route.ts` passes files through `mammoth`/`pdf-parse`/text parsers. Invalid files cause library-level parse errors, which are caught and returned as 400.

## What's at risk

A malicious user could store an arbitrary binary file disguised as an image. The file would be stored but served with an image Content-Type, preventing browser execution. No server-side code execution risk.

## What's already secure

MIME type whitelist (only 4 image types), UUID file naming, 10 MB limit, authentication required.

## Recommendations

1. **[LOW — Fix]** Add magic bytes validation for PNG, JPEG, GIF, and WebP to reject files that lie about their MIME type.
