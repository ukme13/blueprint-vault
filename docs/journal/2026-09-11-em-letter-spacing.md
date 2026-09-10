# 2026-09-11 — em letter-spacing

Follow-on to fluid `clamp()` (`3dacf8a`). Size interpolates between named
frames; tracking that stayed in px (or rem, or pt) was a fixed gap while the
letters grew. Letter-spacing now ships as `em` relative to the role's desktop
size.

## What changed

Stored `letterSpacingPx` is unchanged. Conversion is at the edges, the same
rule as size units. The divisor is the desktop resolved size — not the phone
size, and not the active preview frame — so one token matches the file
whether you are looking at 24px or 56px.

`--font-h1-letter-spacing` stays in `:root`. It does not clamp. Fluid size
already scales an `em` value.

The editor still shows px. Preview, documentation specimens, and both CSS
and Tailwind exports apply `formatLetterSpacing`. Switching the size unit
no longer rewrites tracking.

## Roadmaps

`typography-preview-and-units.md` Stage 1 no longer defers `em` tracking.
The later list drops that item. Per-device letter-spacing and a configurable
rem root remain.

## Checks

- Vitest `export`, `system-export`, `role-rows`, `export-guard`.
- Playwright `typography-export.spec.ts` — body tracking stays `0em` in rem,
  pt, and px.

## Lessons

**Desktop is the authored size.** Dividing by the current frame would preserve
the px gap at every named width, which is the old behaviour with extra maths.
Dividing by desktop makes tracking a proportion of the size you designed, and
the interpolated sizes inherit it.

**Do not `export *` a new `format*` helper without the guard.** `formatLetterSpacing`
is a value formatter, next to `formatLength`.
