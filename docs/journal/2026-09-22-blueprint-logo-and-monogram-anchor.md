# 2026-09-22 — New Blueprint logo, 2rem rail marks, and a monogram that does not move

The brand marks in the playground shell came from an older cut of the logo:
the big B followed by "lueprint", with the B doing double duty as the first
letter. The current logo file, `blueprint-logo-cropped-02.svg`, is the B
monogram followed by the full word "blueprint". This pass swaps every mark to
that file, sizes the rail marks to match Home, and pins the monogram to one
pixel column so the rail no longer wobbles when it opens or closes.

## Key changes

1. **Three marks from one file** (`shell-marks.tsx`):
   - `BlueprintMark` — the B and its dot, `viewBox="0 0 104 174"`. Unchanged
     size on the rail in both states.
   - `BlueprintWordmark` — the full logo, `viewBox="0 0 541 174"`, on the Home
     top bar.
   - `BlueprintLetters` — the word only, `viewBox="104 0 437 174"`. The
     viewBox starts where the monogram's ends, so the gap between B and word is
     the logo's own and the rail link uses `gap: 0`.
   - Every SVG sized by height carries an explicit `aspect-ratio` in CSS
     (`541 / 174`, `437 / 174`, `104 / 174`), per the WebKit lesson from the
     seamless-rail pass.

2. **Home logo on the content edge**: Astryx `TopNav` pads 8px and
   `TopNavHeading`'s link pads 8px, which put the logo at x = 16 while the
   Projects heading sat at x = 32. `.homeNav` now adds
   `padding-inline-start: var(--spacing-6, 24px)`, so 24 + 8 = 32.

3. **Rail marks are 2rem**: the monogram and letters on the rail were 1.25rem,
   the Home wordmark 2rem. Both rail states now draw the marks at 2rem inside
   the existing 36px brand row.

4. **The B is anchored at x = 16**:
   - Open rail: the logo link pads 8px, so the B starts 16px into the rail.
   - Closed rail: the 36px expand `IconButton` used to centre the 19px-wide B,
     landing it at 16.4px. It now pads 8px and start-aligns the icon, including
     the spans Astryx `Button` wraps around it, so the B starts at exactly 16px.
   - The project name field pads 8px too, so its text shares the column.

5. **Project name field, carried from the previous pass**: the container keeps
   `overflow: visible` so the focus ring is not clipped, and focus after
   expanding from the pencil waits for the 240ms width transition instead of a
   single animation frame.

## Architectural decisions

- **Left-align the collapsed glyph rather than compute a centring offset.**
  A centred 19.125px glyph lands on a fraction of a pixel. Start-aligning both
  states at the same 8px token gives an integer that survives any future
  change to the mark's width.
- **Override Astryx `Button` internals only inside the collapsed trigger.**
  The `.collapsedTrigger span` rule is scoped to one class in one CSS module.
  It is not a global `.astryx-*` remap and does not touch `theme.css`.
- **The name field follows the monogram, not the other way round.** The brand
  mark is the visual anchor of the rail; the text field is chrome around it.

## Checks

- `pnpm lint` at `--max-warnings 0` across all packages.
- `pnpm --filter playground check-types` clean.
- Playwright `apps/playground/e2e/workspace-shell.spec.ts` with
  `--reporter=line`:
  - Home logo left edge is within 1px of the Projects heading.
  - Every rail mark measures 32px tall, open and closed.
  - The monogram's x is 16 when open and does not change on collapse.
  - Logo link and name field both pad 8px.
  - Each new assertion was seen failing once against the previous CSS
    (16px off on Home, 20px tall marks, 14 vs 16 on the anchor, 6px padding).

## Lessons learned

**Measure both states before choosing a padding.** The 6px link padding was
chosen to match the name field, but nobody had measured where the collapsed
button put the same glyph. One Playwright script that prints `boundingBox()`
for the mark in both states showed the 2.4px shift in seconds.

**An `IconButton` centres through nested spans, not the button.** Setting
`justify-content` on the button element did nothing; the icon sits inside an
inner `display: flex` span. Walking the element chain from the SVG up to the
button with `getComputedStyle` found the real centring node.

**A test can pass for the wrong reason.** The Home alignment assertion first
"passed" against the old CSS because it had been added to a different test
than the one run by name. Running the test that actually holds the assertion,
and watching it fail, is the only proof.

**A shared dev server makes route compiles look like flaky tests.** Running
the spec against an already-running `next dev` on another port works, but
the first visit to a cold route can exceed a 5s `toHaveURL` wait. Warm the
routes with a request first, or run the spec against its own server.
