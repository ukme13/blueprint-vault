# 2026-10-12 — A test that lost a click to the library's own delay

One commit on `fix/deflake-base-unit-popover-test`. "Picks a base unit from Figma-style
presets, by search and keys" failed about one run in ten on its last focus assertion,
and had failed in four of the full runs made in a week, always passing alone.

## Key changes

- **The second open waits out the library's beat.** The test picks a preset, which
  closes the list, and clicks the chip again straight away to test Escape. Astryx
  ignores a press on a trigger for a short while after its list closes, so that click
  is now and then dropped, the list never opens, and the search is never focused. The
  test waits 400ms before the click, as the dev-warning test beside it already does.
- **Reproduced before it was changed.** Run 20 times in parallel, it failed 2 times at
  that assertion (`spacing-studio.spec.ts:302`); after the wait, 40 times in 40.

## Lessons learned

- **A flake that passes alone is a race with the harness's own speed.** Alone, the
  browser is slow enough that the library's delay has passed by the second click; with
  four workers sharing the machine, it was not. Running it many times in parallel is
  what reproduces it, and is a quicker check than waiting for CI to fail.
- **Find the line before guessing the cause.** The failure read "not focused", which
  suggests the popover's focus code; the failing line was the second open, and the
  popover had not opened at all.
- **A fixed wait is the honest fix when the delay is the library's.** There is no event
  to wait on for a click the library will ignore, so the wait is named for what it waits
  out, and kept next to the click it protects.
