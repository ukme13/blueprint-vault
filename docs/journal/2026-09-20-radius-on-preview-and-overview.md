# 2026-09-20 — Preview and Overview follow the Radius scale

Roundness is a Radius-studio decision. Preview and Overview were not
proof of that decision: buttons sat on Tailwind `rounded-lg`, Overview
tiles used literal px, and Astryx Neutral reseeding `--radius-element` in
rem meant the Roundness slider could move while the pages stayed still.

No Preview ⋯ control. The scale is the character.

## What paints now

**Button** corners are `rounded-element` → `--radius-element`. Size still
owns height, padding, and icon scale. Docs copy says so.

**Preview.** Sign up follows `--radius-element` (8px at 1×, 10px at
1.25×). Pricing cards already used `--radius-surface` (desktop → page:
28px / 35px). Quote and feature blocks stay unboxed — they were never
cards, and inventing frames just to show radius would be a lie.

**Overview.** Bento tiles are `--radius-container`. Specimen buttons,
search, the nav icon-button group _and its wrapper_, tool icons, and the
pencil square are `--radius-element`. Progress tracks stay `--radius-full`.
Icon-button specimens are `2.25rem`, the same as Button `size="icon"`.

The nav wrapper started as a pill (`--radius-full`). Full does not
scale, so Roundness left it looking unchanged. It now follows the icon
button, which is what that control is.

## How the tokens reach the tree

`packages/ui/src/theme.css` seeds the six named radii inside `@theme
static` so `rounded-element` exists at all. `WorkspaceShell` writes
`radiusCssVariables` at runtime.

Writing only on `document.documentElement` was not enough. Astryx Theme
puts Neutral’s rem seeds (`--radius-element: 0.625rem`) on
`[data-astryx-theme]`, between `:root` and every studio. Overview
buttons then computed 10px while cards still read 12px from a coincidental
`0.75rem` container. The shell now sets the workspace px values on both
`:root` (body-portaled chrome) and the theme wrapper (everything inside
AppShell). Preview’s canvas already injected the same map, which is why
Sign up looked correct before Overview did.

## Checks

- `pnpm lint` at `--max-warnings 0`.
- Vitest: `primitive-usage`, `scale/radius`.
- Playwright `--reporter=line`: Preview Sign up / Starter plan at 1× and
  1.25×; Overview cards, buttons, search, nav wrapper, nav icon, and
  wand tool at the same multipliers. Each new assertion failed once on
  the old hardcoded corners before the bind.

## Lessons

**A token on `:root` is not a token on the page** when a theme wrapper
reseeds the same names. Measure `getComputedStyle` on the node that
paints, not on `html`.

**`rounded-lg` at 8px hid the bug.** At multiplier 1 the Button looked
right. ArrowRight on Roundness is the proof; 8px staying 8px is the
failure.

**`--radius-full` is not “more rounded.”** It is a pill, and it does not
follow the multiplier. A wrapper around icon buttons that should show
the scale must use `--radius-element`.

**Do not invent chrome to demonstrate a token.** Feature and quote
blocks on Preview were unboxed on purpose. Overview’s nav wrapper was
already a box; it only needed the right name.
