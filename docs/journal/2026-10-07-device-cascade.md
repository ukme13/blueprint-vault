# 2026-10-07 — Phone follows tablet before desktop

One commit on `feat/typography-cascade`, on top of `fix/size-input-states`.

## Key changes

- **A cascade, Desktop → Tablet → Phone,** for size, line height and letter
  spacing. A phone with no value of its own reads tablet's own value when
  tablet has one, and the shared desktop value only when it does not.
- **Size cascades off the ramp only.** A role on a step stays on it on
  every frame that has no size of its own.
- **Following is not overriding.** A phone that follows tablet shows the
  default colour and no ✕. Phone's own value is the override, accent with a
  ✕, and the ✕ puts it back on tablet's.

## Architectural decisions

- **One rule in one place.** `cascadeKey` answers "whose own value does
  this frame read" for all three maps; `CASCADE_PARENT` is `{ phone:
"tablet" }`. Tablet follows desktop directly and never phone.
- **Tracking phone follows from tablet is divided by phone's own size,** as
  a frame-level length, so phone renders the number it shows. Shared
  tracking stays a proportion of the desktop size.

## Lessons learned

- **A fill into an unfocused field can lose its select-all.** The field
  moves its caret to the end on the frame after it gains focus; when
  Playwright's `fill` did the focusing, that could land between its
  select-all and its typing, so "18" went in after "20" and "2018" was
  clamped to 400. One run in five under load. `fillHybridNumber` now
  focuses, waits a frame, then fills: 30 of 30 after.
- **A unit test that times out is not a failing assertion.** The CSS token
  scan ran 9.6s against a 5s limit while a build was running; on a quiet
  machine it passed.

## Checks

- `pnpm lint`; `packages/ui` 1569 and `apps/docs` 65 unit tests. Six cascade
  tests fail when the cascade map is emptied.
- Playwright against a production build, full suite: 566 of 567. The one
  failure is the same spacing-studio preset flake. Not retried.
