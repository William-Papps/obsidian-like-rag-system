# Access Control Fix Plan

## Changes

- `lib/services/tags.ts` — add `userId` parameter to `setNoteTags` and `addNoteTag`; filter tag IDs against the user's own tags before insertion
- `app/api/notes/[id]/tags/route.ts` — pass `user.id` to updated service functions

## Verification goals

- [ ] `PUT /api/notes/[id]/tags` with a tagId belonging to a different user silently ignores that tag (no error, no association)
- [ ] `POST /api/notes/[id]/tags` with another user's tagId returns 200 but the tag is not added
- [ ] `grep -n "setNoteTags\|addNoteTag" lib/services/tags.ts` shows userId parameter
- [ ] All legitimate tag operations still work correctly

## Manual verification (for the human)

- Create two accounts, each with a tag
- Log in as user A, capture user B's tag UUID from network traffic
- `POST /api/notes/[noteId]/tags` with that UUID → should succeed with 200 but the tag should NOT appear in the note's tag list
