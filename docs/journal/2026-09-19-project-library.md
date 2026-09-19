# 2026-09-19 — Project library in this browser

Home listed “projects” while storage was one key. New and Import
replaced it. Stage 4 splits the library index from each document so a
shade edit does not rewrite every project, and so Create adds.

## Storage

`blueprint.library.v1` holds `{ currentId, ids }`. Each project is
`blueprint.workspace.{id}`. A missing library with a readable
`blueprint.workspace.v1` copies onto a minted id and stops writing the
old key once the copy reads back — the same retirement rule as the
legacy palette keys. Deleting the last card writes an empty index, not a
missing one, so a leftover v1 cannot come back.

Ids are `crypto.randomUUID()` in the browser. Tests pass a factory.

## Store

`WorkspaceStore` still exposes `project` / `save` / `update` for the
current document. Home also gets `library`, `switchTo`, `add`,
`duplicate`, and `remove`. Uploaded fonts stay in one IndexedDB; switch
and add do not wipe them. Delete leaves bytes too: another card may
still name that family.

## Home

Cards are the switcher. Current is marked. Duplicate lands next to the
source as `{name} copy` and stays on Home. Delete confirms. Cap is 8;
New and Import disable with a reason when full. Import always adds.

## Checks

Vitest: migrate v1; add does not overwrite; switch; delete last; duplicate
copies slices; cap of 8; studio update writes only the current id (broke
once by writing v1 again). Playwright `workspace-home`: two named cards,
New keeps the first, click opens that rail name, delete with confirm,
empty Home after the last delete, no Settings.

## Lessons

**A list that stores one document is a lie.** The mosaic and the count
were already a grid. The bug was the key.

**Read current on a keystroke, not the whole library.** Eight documents
is a fine Home mount. It is not a fine shade drag.
