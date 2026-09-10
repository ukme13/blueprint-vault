# 2026-09-10 — Per-device type, stacked export, and the pass that cleaned it

Follow-up to merged PR #113 (`feat/hybrid-tokenized-input`). That branch
named the preview frames. This one lets a role store a size and a line-height
on each of them, then writes every frame that actually changed into the
exported file.

## Model

`TypeRole` keeps one shared `stepOffset` and one shared `lineHeight`. Typed
exceptions live in maps keyed by device id: `unlinkedSizes` and
`unlinkedLineHeights`. A missing key follows the shared value. Legacy
`mobile` is `phone`. Typing on one frame does not stamp the others; relinking
deletes that device's key only.

Clearing an unlinked line-height restores the shared config (accent text is
the only indicator). Clearing a field that was already shared still means
auto. Auto uses that frame's resolved font size.

## Export

Frames sort by `widthPx`. The narrowest is `:root`. Each later frame that
changes a size or line-height gets `@media (min-width: ${widthPx}px)` and
only the tokens that changed. Letter-spacing stays shared. Bound roles
resolve against **that frame's ratio**. `--font-size-N` stays on the
canonical desktop ramp.

An authored phone/desktop pair with no tablet key still opens at 768px:
tablet falls back to the typed desktop size, and 768 is the tablet width,
not `breakpointPx`.

## Refactor (this pass)

The size and line-height maps were four copies of "set a key / delete a key /
ask if the key exists / drop keys for gone frames". They now share
`mapRole`, `setDeviceKey`, `omitDeviceKey`, `hasDeviceKey`, and
`pruneDeviceMap`. Export sorts through `sortPreviewDevicesByWidth` and emits
tokens from one list of fields instead of three parallel `if`s. The inspector
role row is its own component; the studio binds the active device once,
outside JSX.

## Checks

- Vitest: system, migrate, role-rows, system-export, preview-devices, plus
  handover/export-guard/docs pages on the export cut.
- Playwright: `typography-line-height.spec.ts`, `typography-export.spec.ts`.

## Lessons

**A desktop/mobile pair is not N frames.** Copying one resolved size onto
both objects hid per-viewport unlinks.

**The old 768px query was the tablet width.** Fallback
(`unlinkedSizes.desktop` when a frame has no key) is what preserves that
number. `breakpointPx` was a second name for the same fact.

**Compare to the cascade, not to `:root`.** If tablet already wrote 56px,
desktop at 56px must not emit a second block.

**Preview ratio has to reach the file.** Using `system.ratio` for every
viewport was the last place bound sizes could disagree with the frame you
were looking at.

**Shared leading is the step; the override is the typed size.** Clearing an
override has to restore 1.5, not invent auto.

**Accent is enough** for an unlinked line-height. No chip, no icon.

## Still later

Fluid `clamp()`, per-device letter-spacing, `em` tracking, a configurable rem
root. `TypeSystem.breakpointPx` is unused by the writer.
