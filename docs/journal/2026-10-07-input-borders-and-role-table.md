# 2026-10-07 — Softer input borders, and a role table that fits its numbers

Four commits on `fix/input-borders-and-role-table-layout`.

## Key changes

- **`--color-border-emphasized` bridges to `border.default`** (neutral-200
  light, neutral-750 dark) instead of `border.strong`, so Astryx inputs have
  a softer edge. Astryx's hover edges, dividers and inset rings read the
  same variable and soften with it.
- **`border.strong` is no longer locked in Semantics.** Nothing outside the
  studio reads it now, so it left `ASTRYX_BRIDGE_ROLE_VARIABLES` and joined
  the free set in `role-consumers.test.ts`.
- **The role table's columns are rebalanced:** Size 7.25–8rem, Weight
  3.75–4.25rem, Line height 6rem–1fr, Spacing 5.25rem–0.8fr. A 120 px line
  height with its ✕ is no longer cropped.

## Architectural decisions

- **Size is as narrow as a typed value allows, not narrower.** It started
  at 5.5rem as briefed. Merged with `feat/typography-input-states`, a typed
  size carries a ✕ and the step button, and "120" was left 0px at 5.5rem and
  14px at 6.5rem of the 22px it needs. 7.25rem fits it with a little over
  for fonts whose digits run wider.

## Lessons learned

- **A bridge change is a lock change.** The semantic table locks what the
  bridge reads, so re-pointing one bridge line unlocked a seeded token; the
  test that holds the free set exactly is what said so.
- **Check widths against the merge, not the branch.** Each branch passed
  alone; only the merged field had three things in a cell sized for two.
  The crop checks now type on Tablet, where a value always has its ✕.

## Checks

- `pnpm lint`; `packages/ui` 1548 and `apps/docs` 65 unit tests.
- Playwright against a production build, standalone: 111 of 111. The crop
  test fails with the old widths.
- With the other three branches of the day merged in: 200 of 200.
