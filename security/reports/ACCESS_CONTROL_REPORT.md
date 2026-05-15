# Access Control Security Report

## Status: LOW

## Findings

### FINDING 1 — LOW: Tag-to-note association accepts tag IDs without ownership validation

**Files:** `app/api/notes/[id]/tags/route.ts`, `lib/services/tags.ts`

The `PUT /api/notes/[id]/tags`, `POST /api/notes/[id]/tags`, and `DELETE /api/notes/[id]/tags` handlers verify note ownership before proceeding, but pass the caller-supplied `tagId(s)` directly to `setNoteTags` / `addNoteTag` / `removeNoteTag` without checking that the tags belong to the requesting user.

```typescript
// route.ts — note ownership checked, but tagId is untrusted:
const note = await getNote(user.id, id);    // ✓ ownership verified
if (!note) return 404;
const { tagId } = z.object({ tagId: z.string() }).parse(await request.json());
await addNoteTag(id, tagId);                // ✗ no check that tagId.user_id === user.id
```

```typescript
// lib/services/tags.ts — no userId parameter:
export async function addNoteTag(noteId: string, tagId: string) {
  await dbRun("insert or ignore into note_tags ...", [noteId, tagId]);
}
```

**Exploitability:** LOW in practice. Tag IDs are 128-bit random UUIDs — there is no enumeration API. An attacker would need to independently learn another user's tag UUID (no known leak vector). If they did know a UUID, they could:
- Associate it with their own note → read the tag's name and colour on their own note listing (minor info disclosure)
- This does not grant access to the other user's notes, account, or any sensitive data

### All other resource-ID routes: PASS

Every route with a `[id]` parameter in the URL either:
- Includes `user_id = ?` in the SQL WHERE clause, OR
- Runs an ownership verification query first and returns 404 if the check fails, then runs the mutation

The public-link DELETE routes (`notes/[id]/public-link`, `folders/[id]/public-link`) were flagged during automated scan but are safe: they do a `dbGet` with `user_id = ?` and early-return 404 before the `dbRun`.

Full list of checked routes — all PASS:
`notes/[id]`, `notes/[id]/versions`, `notes/[id]/shares`, `notes/[id]/shares/[userId]`, `notes/[id]/related`, `notes/[id]/suggest-tags`, `notes/[id]/public-link`, `folders/[id]`, `folders/[id]/public-link`, `tags/[id]`, `deck/[id]`, `documents/[id]`, `documents/[id]/file`, `workspaces/[id]`, `workspaces/[id]/members`, `workspaces/[id]/members/[userId]`, `admin/users/[id]`, `images/[id]`

## What's at risk

A user with knowledge of another user's tag UUID could associate it with their own notes and read its name/colour. No write access to other users' data, no account compromise.

## What's already secure

- All note, folder, document, workspace, flashcard, and image routes enforce ownership with parameterized SQL (`WHERE id = ? AND user_id = ?`)
- Two-step patterns (check-then-mutate) are correctly implemented with early returns
- No IDOR exists for actual note content, user data, or account operations

## Recommendations

1. **[LOW — FIXED]** `setNoteTags` and `addNoteTag` now use `INSERT … SELECT … WHERE user_id = ?` so only the caller's own tags can be associated. Non-owned tag IDs are silently ignored.
