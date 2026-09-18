# 2026-09-18 — Workspace frames, layout uses, and scale on the rail

Home and the shell already existed. This pass finishes the chrome they
implied, splits Scale into three rail items, and moves preview frames
off Typography so layout can share them.

## Home and shell

Home’s card is one mosaic row per colour family, flush, no 1px gutter.
Blueprint and the name sit on the Home TopNav; studios keep the rail.
Theme on an expanded rail is Light / Dark / System as a segmented
control, not a menu. Collapsed, it is still a sun/moon that opens
beside the nav.

The editable name is one field on the rail (`WorkspaceNameField`).
Studios persist their slices and stop writing the name.

Space swaps the current studio with `/preview`. Home is not a studio;
preview does not remember itself as the place to come back to.

## Scale routes

`/spacing`, `/radius`, and `/elevation` are rail items. `/scale`
redirects to spacing. They still share one history: undo is the last
edit on any of those pages.

Elevation opacity is a 2D pad per mode: contact on X, cast on Y. The
stored shape did not change — two layers, per-mode alpha — the editor
stopped writing the same number onto both. `setLevelModeOpacities` is
the pairing; the pad is the gesture.

## Workspace frames

`previewDevices` lives on the workspace root. Phone, tablet, and
desktop stay; up to two extra desktops. Widths are frames. Ratio stays
typography-only and is edited in the type inspector.

A v7 file still carries the list on the typography slice. Read lifts
it. A v8 file without the root list would snap a v7 reader back to the
three defaults, so the file version moved to 8.

Layout uses are the other client of that list: `--inset-container`,
`--gap-section`, `--radius-surface`. Each row points at a spacing step
or a radius token per frame, the way a semantic colour points at a
shade per mode. Defaults: inset 4 / 6 / 10, gap 6 / 10 / 16, radius
`container` then `page` at 1120. They do not collide `--radius-container`
(already 12px). Export appends `min-width` aliases to `blueprint.css`.
Micro-spacing stays on the primitives. Per-breakpoint spacing knobs do
not belong on Scale Studio.

Settings is a gear on Home (TopNav end) and on the studio rail (beside
Theme, not in the footer). Next’s overlay occupies the bottom-left in
`next dev` and intercepts footer clicks; production does not have that
overlay, but Theme was already the slot a person can hit. The dialog
owns widths and add/remove. Typography and the layout table only read.

## Checks

- Vitest: `layout-tokens`, workspace lift / root-wins / prune,
  workspace-file v7 lift and version 8, `export-guard` formatter list,
  `docs-export` after regenerating `blueprint.css`.
- Playwright: `workspace-settings` (Home and rail, extra desktop as a
  layout column and a type frame); typography “adds extra desktop
  frames from settings”; existing elevation pad coverage in
  `spacing-studio`.

## Lessons

**A list two studios edit is not a preference of either.** Devices on
typography meant layout could only copy them, and Settings could not
own add/remove without fighting the type persist effect. Root list,
slice writers that re-read storage, prune unlinked sizes on the
typography write: three doors, one document.

**The file version is for the other direction.** Lifting on read is
lossless for a v7 file. A v7 build handed a v8 file would drop the
root list and put seed roles back. Refusing the file is the honest
failure.

**Footer icons are unclickable in `next dev`.** The overlay portal
wins. Put an authoring control next to Theme, not beside Collapse.

**Layout tokens are aliases, not a second scale.** Pointing at
`--spacing-4` keeps Density and the grid as the calibration. A table
with device columns is the colour Semantics pattern with width instead
of mode. It is not the Semantics table component.
