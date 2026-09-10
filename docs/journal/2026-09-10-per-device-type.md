# 2026-09-10 — Per-device type size and line-height

Follow-on to named preview devices (`1f04813`, journaled in `2026-09-10.md`).
A role no longer stores a desktop/mobile pair. Phone, tablet, desktop, and
any extra desktops each hold a size, and line-height can diverge the same
way. Letter-spacing stays shared.

## Model

`TypeRole` keeps one shared `stepOffset` and one shared `lineHeight`. Typed
exceptions live in maps keyed by device id:

- `unlinkedSizes` — px. A missing key follows the step on that frame's ramp.
- `unlinkedLineHeights` — a `LineHeightConfig`. A missing key follows the
  shared config.

Legacy `mobile` is `phone`. `bindRoleStepOnDevice` / `unlinkRoleSizeOnDevice`
and `bindLineHeightOnDevice` / `unlinkLineHeightOnDevice` write one frame and
leave the others. Removing an extra desktop prunes both maps.

Migrate: a fully unlinked save becomes `{ desktop, phone }` sizes; a bound
role with a different mobile size becomes `{ phone }` only. Older files
without `unlinkedLineHeights` load as `{}`.

## Inspector

The Groups size field and line-height field both read the active top-bar
frame. Bound size is a step chip; typing unlinks that frame only. Relinking
picks a step and deletes that device's typed size.

Line-height has no chip. An override is accent text (`--color-fg-accent`).
Clearing the field (empty + Enter/blur, or the clear button) drops the
override and the colour. Clearing a field that was already shared still
means auto, which is how a migrated 1.5 becomes the empty placeholder.

Auto still uses that frame's resolved font size, so a phone unlinked to 14px
snaps leading from 14, not from desktop's 16.

## Studio chrome that landed in the same tree

A bound hybrid chip no longer detaches on double-click — too easy to hit by
accident. Detach is typing in the 1ch caret, or Backspace/Delete.

Preview device icons sit in the page header centre, matching Colour's top
bar, not next to Editor/Preview on the local toolbar.

## Export, still one stop short

The file still writes phone in `:root` and desktop in one min-width block.
Tablet and extra desktops are stored and previewed, then dropped. Stacked
min-width export is the next cut.

## Checks

- Vitest (`system`, `migrate`, `role-rows`, `system-export`,
  `line-height-edit`): 166 passed.
- `@blueprint/ui` and playground `tsc --noEmit`: passed.
- Playwright `typography-line-height.spec.ts`: 10 passed, including typing
  on phone leaving desktop shared, and clear restoring the shared ratio.
- Playwright size type/relink and previous-release load: passed earlier in
  the same session.

## Lessons

**A desktop/mobile pair is not N frames.** Copying one resolved size onto
both objects hid per-viewport unlinks. The maps make "typed on this frame"
a stored fact, not a preview stamp.

**Shared line-height is the step; the override is the typed size.** Auto on
the role is the default every frame follows. A pinned 28px on phone is not
a new default — clearing it has to restore 1.5, not invent auto.

**Accent is enough.** An unlinked line-height does not need a chip or an
icon. Colour is the indicator; empty is the revert.

**`name: "Desktop"` is still a substring.** Extra desktops are `Desktop 2`.
Playwright needs `exact: true` here the same way the device-bar tests did.
