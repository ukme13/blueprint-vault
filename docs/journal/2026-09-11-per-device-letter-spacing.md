# 2026-09-11 — Per-device letter-spacing

Follow-on to `em` tracking (`d83fa23`). Size and line-height already unlinked
per named preview frame. Letter-spacing was still one shared px field, so
typing on phone rewrote desktop. It now follows the line-height rule.

## Model

`TypeRole` keeps shared `letterSpacingPx`. Typed exceptions live in
`unlinkedLetterSpacings`, keyed by device id. A missing key follows the
shared value. Legacy `mobile` is `phone`. Removing an extra desktop prunes
the map.

Export still writes `em`. Shared tracking uses the desktop size. A typed
frame uses that frame's size, so `-0.5px` on a 24px phone is not the same
`em` as `-0.5px` at desktop. Frames that differ interpolate with `clamp()`,
same writer as size and line-height.

The editor is still px. Clearing an override relinks; accent marks a typed
frame.

The em divisor is `letterSpacingEmSizePx`: typed tracking uses that frame's
size, shared tracking uses desktop. Preview, docs rows, and export all call
it, so a typed phone value cannot silently convert against 56px.

## Roadmaps

`typography-preview-and-units.md` drops per-device letter-spacing from later.
A configurable rem root and extra templates remain.

## Checks

- Vitest `system`, `system-export`, `migrate`, `role-rows`, `fluid`.
- Playwright `typography-letter-spacing.spec.ts`.

## Lessons

**Shared `em` and a typed frame's `em` are different conversions.** Leaving
phone on the shared `-0.5px` keeps desktop-relative tracking. Typing `-0.5`
on phone stores an override and converts against 24px, which is the px you
typed at the size you were looking at.
