# 2026-10-09 — The Accessibility tab opens on a sandbox

Sixteen commits on `feat/accessibility-sandbox`. The Accessibility tab was a
report to read. It now opens on a small hero whose every colour can be picked,
a score for the pair that is selected, and a WCAG 2 | WCAG 3 choice that
re-words the hero's score and the report below it.

## Key changes

- **A hero, laid out as Figma has it.** A full-bleed block under the toolbar:
  a badge, a heading, a paragraph and a Get started button. The hero is the
  background layer, so what is not another layer is the background.
- **Figma-like selection.** A click selects a layer, with an outline, corner
  handles and a size tag (`320 × 104 · Fill × Hug`). A badge or a button
  selects its fill first; Ctrl or Cmd click, a double click, or Ctrl Enter goes
  into its text. On a phone a tap on a held container goes in, and a tap on
  its text comes back out. Escape lets go.
- **Two ways to give a layer a colour.** A role of the semantic layer, which
  follows light and dark, or a primitive shade, which does not. A control bar
  holds the target, a picker with Semantic and Primitive tabs and search, a
  25 to 950 ramp (a wide screen only) and a Reset that puts every layer back on
  the roles the sandbox opened with.
- **The score.** A card over the hero's top left on a wide screen, one strip
  under it on a phone. Text on Fill and Fill on Page, each with a mark ahead of
  it drawn in the pair measured: a bold A for heading text, an a for body and
  small text, a square for a fill. A pass is its tick and its grade (`✓ AAA`),
  with no word Pass; a fail keeps its word; a canvas on its page is advisory.
- **A standard toggle.** `WCAG 2 | WCAG 3` before Vision on the Accessibility
  toolbar only, the same preference the Contrast tool reads. It drives the
  hero's copy and score and the whole report: Lc, tiers (Body, Large, UI,
  Fail) and the warning count by Lc under WCAG 3.
- **One rule for the figure shown and the figure judged.** An Lc is judged as
  the whole number it shows. A WCAG 2 ratio is shown cut to its places, never
  rounded up. Applied to the sandbox card, the report, the swatches and their
  warning bars, the shade details and the Markdown export.
- **Labels are their own job.** A button's or badge's text needs Lc 60 under
  WCAG 3 (large text's line) and 4.5:1 under WCAG 2, not body text's Lc 75.

## Architectural decisions

- **The rules are pure and in `packages/ui`.** `accessibility-sandbox.ts` (the
  layers, their roles, resolving a colour in a mode, the rows of the card,
  what a press selects, whether the sandbox is at its defaults),
  `accessibility-standard.ts` (grading a pair under a standard),
  `accessibility-report.ts` (what each report row says) and the shared figures
  in `contrast-reading.ts` (`shownLc`, `cutRatio`, `ratioText`). The
  components render.
- **The standard is the view's, not the page's.** The toggle sets
  `contrastStandard` in `PaletteViewContext`, so the Colour studio's Contrast
  tool and this tab never disagree.
- **Layers are one overlay over the hero.** The selection outline is a single
  element placed over whichever layer is selected (`useElementBox`), not an
  outline on each, so no layer's overflow can clip it.
- **The canvas is a group, not a button.** A button may not contain another;
  the layers inside it are the buttons.
- **A phone gets a sheet, a title and held tabs.** The picker is
  `PopoverOrSheet`; in a sheet the title and the tabs go in the selector
  list's held head with the search.

## Lessons learned

- **A flex item in a bar that scrolls can shrink to nothing.** The picker's
  wrapper sat beside a 560px ramp and collapsed to zero width, so on a phone
  the only way to choose a colour from a list was not there. It was a CSS bug,
  not a missing feature.
- **A selector sheet's held head assumes a gap its own layout gives.** The head
  cancels 12px of gap with a negative margin. The picker's panel had no such
  gap, so the list began under the head and the first group title was cut off.
- **A rounded figure beside a verdict that was not rounded is a contradiction.**
  "Lc 45, Fail" against a line of 45 and "4.5:1, Fail" both read as bugs. The
  figure on screen and the figure judged have to be one number.
- **A button's label is not body text.** Holding it to Lc 75 marked a bold
  Lc 74 button as failing.
- **A stale dev server mixes old and new rows.** A first row with no mark and
  the word Pass above three new rows was a hot-reload leftover, not the code.
- **Heredoc-written scripts lose backslashes and trailing spaces,** again: the
  regexes in the spec were mangled more than once. The editor tool is the safe
  way to write one.

## Not done

- A phone has no hint that a second tap goes into a button's text.
- The sandbox's colours are scratch state: they reset on reload and are not
  saved with the project.
- The shade details popover still shows an Lc to one decimal and judges it
  exact. It shows its decimal, so it cannot contradict itself.
- The docs app's contrast table still rounds its ratios; it reads the exported
  package, not this code.
- It has not been looked at in WebKit. A different page of this app showed a
  WebKit-only layout bug this week (on `fix/new-project-sheet-webkit`), and
  nothing here has been run on an iPhone.
