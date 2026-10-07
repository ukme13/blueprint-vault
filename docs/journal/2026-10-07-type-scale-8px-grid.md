# 2026-10-07 — Sizes above 48px snap to the 8px grid

One commit on `feat/type-scale-8px-grid`.

## Key changes

- **`roundToEvenPx` has two tiers.**
  - 48px and below: the nearest even pixel, ties toward a multiple of four,
    never below 11. Unchanged.
  - Above 48px: the nearest multiple of eight, ties toward a multiple of
    sixteen (52 → 48, 60 → 64).
- Step 8 on a 16px base at 1.25 (61.04) is now 64, not 62. The docs
  reference files are regenerated: h1 and display move from 62 to 64.

## Architectural decisions

- **The threshold is "above 48", so 48 itself stays on the even grid**
  (47.2 → 48, 48.83 → 48).
- **Ties go to the larger power of two** in both tiers, so every tie has
  one answer.

## Lessons learned

- **The 8px grid tidies line heights too.** On 64, display's 1.1613 and
  h1's 1.2258 line-height ratios became 1.125 and 1.25.

## Checks

- `pnpm lint`; `packages/ui` 1562 and `apps/docs` 65 unit tests. Four tests
  that pinned h1 at 62 now pin 64; the new tier's tests fail without it.
- Playwright against a production build, full suite: 563 of 563.
