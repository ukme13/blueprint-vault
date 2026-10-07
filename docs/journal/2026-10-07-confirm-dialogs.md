# 2026-10-07 — Deletes ask first, and AdaptiveDialog closes from its backdrop

One commit on `feat/confirm-dialogs-and-overlay`.

## Key changes

- **`AdaptiveDialog` is `purpose="info"`.** A backdrop click now closes
  "Sync with palette anchors" and "Tone family", as it does every other
  studio dialog and as the phone sheet already did.
- **A `ConfirmDialog` before every destructive delete:**
  - a custom elevation level — `Delete elevation level "…"?`, naming its
    `--shadow-…` variable;
  - a custom layout use — `Delete use "…"?`, naming its variable;
  - a type role — `Delete role "…"?`;
  - semantic tokens — `Delete token "…"?` or `Delete N tokens?`.
- **Semantic tokens ask from every path:** the row menu, the batch action
  and the Delete key all go through `SemanticDeleteDialog`.

## Architectural decisions

- **The Delete key asks too.** Otherwise it would be the way round the
  question the menu asks.
- **Each confirm lives with its trigger** (row menu, role row, elevation
  canvas), as `RoleGroupMenu` does, rather than in one page-level dialog.
- **A layout use is named by its name and variable.** It has no `label`;
  the title shows "Hero inset copy" and the description `--hero-inset-copy`.

## Lessons learned

- **`purpose="form"` only blocks the backdrop after interaction** in
  Astryx 0.5.0. `info` means a stray click outside a half-filled dialog
  closes it; these dialogs hold a choice that is a second to redo.

## Checks

- `pnpm lint`; `packages/ui` 1548 and `apps/docs` 65 unit tests.
- Playwright against a production build: spacing studio, typography
  editing, semantic table, editor and tones, dialog dismissal, 167 of 167.
  A new spec closes Sync from its backdrop; it fails with `form` back.
- With the other three branches of the day merged in: 200 of 200.
