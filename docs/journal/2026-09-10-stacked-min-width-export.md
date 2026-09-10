# 2026-09-10 — Stacked min-width type export

Follow-on to per-device size and line-height (`ec3947d`). The file used to
write phone in `:root` and one desktop override at `system.breakpointPx`.
Tablet and extra desktops were stored and previewed, then dropped. Export now
walks every named preview frame.

## What the file contains

Frames are sorted by `widthPx`. The narrowest goes in `:root`. Each later
frame that changes a role token gets `@media (min-width: ${device.widthPx}px)`.
A frame that matches the one before it is skipped, so a project whose ramps
all resolve equal still ships no media query, and an authored phone/desktop
pair with no tablet key still opens at **768px** — tablet falls back to the
typed desktop size, and 768 is the tablet width, not `breakpointPx`.

Override blocks emit only tokens that changed. Letter-spacing is still
shared, so it stays in `:root`. Bound roles resolve against **that frame's
ratio**, so a tablet with a steeper ramp writes the sizes the preview showed.
`--font-size-N` stays on the canonical desktop ramp (`system.ratio`).

The studio export dialog and the handover `blueprint-typography.css` both
pass `previewDevices`. Call sites that omit the list get
`defaultPreviewDevices(system.ratio)`.

## Not in this cut

Fluid `clamp()` between consecutive frames (see
`2026-09-10-fluid-clamp-export.md`). Per-device letter-spacing, `em` tracking,
and a configurable rem root. `TypeSystem.breakpointPx` is unused by the
writer in this cut; it is dropped in `2026-09-10-fluid-clamp-export.md`.

## Checks

- Vitest `system-export` plus docs-export, handover, export-guard, role-rows:
  67 passed. Docs `foundation-pages`: 21 passed.
- `@blueprint/ui` and playground `tsc --noEmit`: passed.
- Playwright `typography-export.spec.ts`: 4 passed, including typing 14 / 18
  / 20 on phone, tablet and desktop and seeing both 768 and 1120 queries.

## Lessons

**The old 768px query was the tablet width.** Keeping fallback
(`unlinkedSizes.desktop` when a frame has no key) is what preserves that
number for authored phone/desktop saves. Pointing queries at
`breakpointPx` would have been a second, drifting source of the same fact.

**Compare to the cascade, not to `:root`.** If tablet already wrote 56px,
desktop at 56px must not emit a second block. Diffing every frame against
phone would have re-emitted desktop even when tablet had already arrived.

**Preview ratio has to reach the file.** Using `system.ratio` for every
viewport was the last place bound sizes could disagree with the frame you
were looking at. Unlinked sizes never had that bug; bound ones did.
