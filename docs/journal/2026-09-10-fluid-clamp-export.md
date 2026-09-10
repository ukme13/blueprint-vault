# 2026-09-10 — Fluid clamp() type export

Follow-on to stacked min-width (`04f568a`). A layout between two named frames
was stuck on the narrower size until the next query. Consecutive frames that
differ now interpolate.

## What the file contains

Frames still sort by `widthPx`. The narrowest goes in `:root`. A pair whose
size or line-height differs writes `clamp(min, preferred, max)`: the bounds
are those two values (smaller first, because CSS requires min ≤ max), and the
preferred value is linear between their widths —

`calc(from + delta * (100vw - fromWidth) / span)`.

The span stays in px whatever unit the file uses, so rem export does not
invent a rem viewport. A later pair starts at
`@media (min-width: the earlier frame of that pair)`. Identical consecutive
frames are skipped; a project whose frames all resolve equal still ships no
clamp and no query.

Letter-spacing stays shared. `--font-size-N` stays on the canonical desktop
ramp. Bound roles still resolve against that frame's ratio.

An authored phone/desktop pair with no tablet key clamps from 375px to 768px
in `:root` and does not emit a 768 query — tablet already holds the desktop
typed size, so there is nothing left to start there.

`TypeSystem.breakpointPx` is gone. Old saves that still carry it load; the
field is not written back. Preview `widthPx` is the only viewport number.

## Roadmaps

`typography-studio.md` moves fluid type and named-device overrides out of
"later". `typography-preview-and-units.md` adds Stage 6 and stops listing
clamp as missing.

## Checks

- Vitest `fluid`, `system-export`, `role-rows`, `migrate`, `docs-export`,
  `export-guard`.
- Playwright `typography-export.spec.ts`.

## Lessons

**Clamp starts on the earlier frame of the pair.** The 56→64 extra-desktop
segment begins at 1120, not at 1440. Emitting at the later width would hold
56 until 1440, which is the jump this cut exists to remove.

**Progress has to be unitless.** `from + delta * (100vw - fromWidth) / span`
works for both lengths and line-height ratios. Slope-as-`vw` plus a px
intercept cannot interpolate a unitless leading.

**CSS clamp wants min ≤ max.** A type that shrinks as the viewport grows
still interpolates; the bounds swap, the preferred value keeps the negative
delta.

**A second name for tablet width will drift.** `breakpointPx` was 768 because
that was the tablet frame. Once extra desktops and custom widths existed, it
was a stale copy. Dropping it is cheaper than teaching it to follow.

## Still later

Per-device letter-spacing, `em` tracking, a configurable rem root.
