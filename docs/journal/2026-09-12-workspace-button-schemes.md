# 2026-09-12 — Button tones as workspace data

Colour Studio follow-on to the semantic table. A client with no `info`
status could not delete those eight roles: `usedBy` always saw
`BUTTON_TONES`, and that table is code. Which tones exist is now a
property of the workspace.

## Model

`buttonSchemes` sits on `WorkspaceProject` with the semantic slice, next
to `removedSeedRoles`. Missing on an older save is every seed scheme.
`primary` cannot be omitted: the palette preview and the studio chrome
read it by name. Order follows `BUTTON_SCHEMES`, so two files that name
the same tones compare equal.

`usedBy(id, { buttonSchemes })` only counts Button, the Astryx bridge,
and optional preview consumers for schemes that are still on the list.
Studio chrome (`action.primary-active`, `surface.raised`) always locks.
Default `undefined` is all seven, so existing tests keep their locks.

`dropButtonScheme` shrinks the list first, then deletes the eight roles
against that list. Deleting the rows first would still see the Button as
a consumer and refuse every one. Undo restores layer, removed-seed list,
and schemes together.

The Button component still reads the static `BUTTON_TONES` table. Studio
chrome and `theme.css` keep declaring all seventy-two; only two of those
are real `var()` consumers. Client export already emits only tokens that
exist.

No workspace file version bump. Same as `removedSeedRoles` on a missing
field: an older save that never named schemes is every seed tone.

## Studio

The Semantics sidebar lists the workspace's tones. Non-primary rows get
Remove. Primary stays locked. Toast plus undo, same as a row delete.

## Roadmaps

`semantic-table-editor.md` drops "Removing a whole tone" from still
open. Component-level tokens remain later.

## Checks

- Vitest `button-tones`, `role-consumers`, `selection-ops`,
  `workspace-file`, `semantics-history`, `workspace`.
- Playwright `semantic-table.spec.ts` (remove Info, reload).

## Lessons

**Unlock, then delete.** A load-bearing check that reads the scheme list
cannot lift itself. The operation has to change the list in the same
step as the rows, and history has to remember both, or undo puts eight
roles back under a lock that still names them.
