# 2026-10-09 — Contrast grows a second standard

Ten commits on `feat/contrast-wcag3`. The Colour Studio's WCAG 2 button became
a Contrast tool with two standards, a warning on every swatch, and active
states that can be read.

## Key changes

- **Contrast is one group.** Off, it is the Contrast button alone. On, WCAG 2
  and WCAG 3 appear beside it (`ContrastControl`). Contrast names the group and
  is never lit; the standard measuring is. Pressing Contrast switches on in the
  standard last used and off if it is on; pressing the lit standard turns it off.
  There is no Off button, because those already are one. The standard is kept
  with the other view preferences. On a phone it is one chip that opens a sheet,
  which gained the same choice.
- **APCA is in the package** (`apca.ts`, APCA-W3 0.0.98G-4g): the signed Lc, and
  the tiers of 75, 60 and 45 for body text, large text and UI. It reproduces the
  published figures: black on white is 106.04, white on black is -107.88, and
  `#777` on white is 71.6.
- **A swatch reads by the standard.** WCAG 2 shows the ratio to one place;
  WCAG 3 shows the size of the Lc. A shade's details grade by Large text, Small
  text and Graphics, or by Body, Large and UI (`ShadeApcaResult`).
- **One polarity.** Which of the pair is the text, `on` or `under`, is a view
  preference shared by the toolbar, the matrix and every shade's details. The
  toolbar word is a button; reached for, the word gives way to Lucide's
  arrow-left-right in the same cell. WCAG 2 is the same either way; for WCAG 3
  the matrix's Lc is measured the other way round.
- **A warning along the foot of a swatch.** A 2px bar, red or amber, only where
  there is something to warn of: WCAG 2 under 3:1 or between 3 and 7, WCAG 3
  under Lc 45 or between 45 and 75. A pair that passes has no bar, and the
  swatch's name says "passes". Judged on the exact figure, not the rounded one.
- **Active states are filled.** Contrast's standard, Vision and the semantic
  sidebar's selected group are filled with the action colour and take the
  on-action text, 5.6:1 in light and 5.0:1 in dark.
- **A custom icon**, `ContrastIcon`, in `packages/ui/src/components/icons/colour`.
- **The hex fix is here too:** typing `#111000` no longer passes through `#111`,
  applied as `#111111`; a HEX applies at six digits and shorthand on Enter or blur.

## Architectural decisions

- **The rules are pure and in `packages/ui`.** `apcaContrast`, `assessApca`,
  `contrastStatus`, `swatchContrast` and `isContrastWarning` take hex colours and
  return numbers and words; the components render them.
- **The view owns the choice, not each popover.** The swap used to be state in
  every shade's popover. Lifting it into `PaletteViewContext` is what keeps the
  toolbar, the matrix and the details from disagreeing.
- **The toolbar is a component.** `ContrastToolbar` holds the sheet, the phone
  check and the view's settings, and takes only the comparison colour, which the
  matrix also reads. `PaletteStudio` shed that state.
- **Contrast uses the toolbar's own button.** The segments are the same outlined
  buttons as Add colour and Vision, so fill, hover and focus match, 28px tall,
  with the corners squared where they meet.

## Lessons learned

- **Measure before taking a contrast instruction.** White text was asked for on
  the sidebar's selected item. On the muted fill it was 4.2:1 in light and nearly
  invisible in dark, where the on-action colour turns dark. The fill moved to
  the action colour instead, which gives the white text 5.0:1 or better. Vision's
  old tint was 2.4:1 in light, which is what had looked wrong.
- **Buttons ease their colours for 200ms,** so a contrast read straight after a
  click is a frame in flight. The specs poll for the settled value.
- **A count at 80% of the text colour fell to 4.2:1;** 90% clears 4.5.
- **`getByRole("button", { name: "Contrast" })` matches 140 swatches,** whose
  labels say "contrast 4.5 to 1". Those lookups use `exact: true`.
- **An icon passed as a child stacks above the label** in this Button; `leftIcon`
  puts it beside.
- **A label can be cut when it is chosen.** "Custom" was truncated to "Cust…"
  the moment it turned bold. A spec now checks no label scrolls past its box.
- **Heredoc-written scripts eat backslashes,** again: regexes in specs lost them
  more than once, and the editor tool is the safe way to write one.

## Not done

- The Contrast sheet on a phone has no polarity choice; a phone turns the pair
  round from a shade's details.
- Vision's joined option strip is still the muted accent behind ordinary text,
  which reads at 5.0:1 in light; its chip is filled like the rest.
