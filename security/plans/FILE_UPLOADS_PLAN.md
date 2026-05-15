# File Uploads Fix Plan

## Changes

- `app/api/images/route.ts` — add `checkMagicBytes(buffer, mimeType)` that validates the first bytes of the uploaded buffer match the claimed MIME type; called after reading the buffer, before writing to disk

## Magic byte signatures

| Type | Signature |
|------|-----------|
| `image/png` | `89 50 4E 47` (bytes 0–3) |
| `image/jpeg` | `FF D8 FF` (bytes 0–2) |
| `image/gif` | `47 49 46 38` ("GIF8", bytes 0–3) |
| `image/webp` | `52 49 46 46` at 0–3 ("RIFF") + `57 45 42 50` at 8–11 ("WEBP") |

## Verification goals

- [ ] A valid PNG/JPEG/GIF/WebP passes and is stored
- [ ] A file claiming `image/png` MIME type but containing non-PNG bytes is rejected with 400
- [ ] Existing MIME allowlist check still runs first (fast-fail)
