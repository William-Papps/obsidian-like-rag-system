# SQL Injection Security Report

## Status: PASS

## Findings

All database queries use `better-sqlite3` prepared statements with `?` parameterized placeholders. No string concatenation, template literal interpolation, or `.format()` equivalents are used to construct SQL with user input.

### Dynamic IN clauses — all safe

Three locations generate `IN (?,?,?)` clauses dynamically:

1. `lib/services/workspaces.ts` — `workspaceIds` from DB lookup, not user input
2. `lib/rag/retrieval.ts` — `folderIds` from `listDescendantFolderIds(userId, ...)`, values fetched from DB
3. `lib/rag/study.ts` — same pattern as retrieval.ts
4. `app/api/public/folder/[token]/route.ts` — `folderIds` built by BFS traversal from a DB-fetched root folder

In all cases, the values inserted into the `IN ()` placeholder list come from DB query results, not raw user input. The user-supplied value (folder ID token, workspace ID) only appears as a `?` parameter in the initial lookup query.

## What's already secure

Consistent parameterized query usage across 100+ SQL statements in the codebase.

## Recommendations

No changes required. PASS.
