# 2026-09-24 — Every picker a sheet on a phone

Follows `2026-09-24-mobile-sheets.md`, and puts into practice the rule it led
to in CLAUDE.md: on a phone, every selector opens as a bottom sheet, and one
searchable list beats chained selectors. Stacked on `fix/mobile-layout`.

## Key changes

### Pickers

- **The step picker can open a sheet.** `HybridTokenizedInput` takes an
  optional `sheet` renderer. Given one, the preset list opens there instead of
  in its popover, with the same title, search and keyboard behaviour. A tap
  on the chip no longer focuses the typing caret in sheet mode, which would
  have raised the phone keyboard behind the sheet.
- **Every picker that uses it passes the app's sheet on a phone:** Uses,
  radius cards, base unit, type size and device ratios.
- **Eight Astryx `Selector`s became `SheetSelector`:** role font, group
  indexing, preview type role, text colour, background colour, colour format
  and export colour format.
- **The phone trigger looks like a field.** It was bare text and a chevron,
  so the shadow colour read as a heading. The `input` variant (Astryx's
  default) now has a border, a subtle fill and element height, fills its
  width, and ends in the chevron. `ghost` keeps the plain look for toolbars.
- **Elevation's shadow colour is one selector.** Track and weight became one
  grouped, searchable list of every shade, with the swatch in the trigger, on
  every width.

### Tables

- **Uses scrolls sideways** with a width per column (Use 12rem, each device
  11rem, actions 3.5rem), as Semantics does. The step chip is `nowrap` and its
  number does not shrink, so "40" no longer stacks as "4" over "0"; a long
  preset name truncates instead.
- **Semantics on a phone** gives Light and Dark at least 272px, and the alpha
  field 4.5rem, so a chip and "100%" sit side by side.

### Smaller

- The list title under the picker's search has 12px above it, off the divider.
- Overview hides its subtitle on a phone, and its cards take
  `--color-border-subtle` instead of `border-strong`.

## Architectural decisions

- **The package takes a sheet, it does not draw one.** `packages/ui` never
  imports app code, and the app already has one `Sheet` with the fixes every
  sheet needs (handle clearance, nested Escape, white-space). A render prop
  keeps one sheet design, the app's, and costs the package three props'
  worth of types.
- **Domain helpers for the shade list.** The semantic chip and the elevation
  shadow built the same grouped list and split `trackId:weight` by hand.
  `shadeOptionSections`, `shadeOptionValue` and `parseShadeOptionValue` now
  live in `packages/ui` with tests; the icon type is generic, so each caller
  draws its own swatch (the semantic chip through the vision simulation).
- **`usePickerSheet()`** returns the sheet on a phone and nothing on a wider
  screen, so a picker opts in with one line.
- **A width floor, not a new default.** The phone's Semantics columns take
  `max(dragged width, 272)`, so desktop resizing is untouched.

## Lessons learned

**Width moves the break; `nowrap` removes it.** The first Uses
fix gave each device 8rem and "40" still broke into two lines; the columns
needed 11rem and the chip needed `nowrap` as well. Width alone moves the
point at which content breaks; `nowrap` removes the break.

**A shared trigger changes every screen at once.** Restyling the phone
`SheetSelector` trigger for the shadow colour restyled every phone selector
with it. That is the point of one component, but it is worth saying so in
the change, because screens nobody asked about look different too.

**Check the parser by breaking it.** Swapping `lastIndexOf` for `indexOf` in
`parseShadeOptionValue` failed two of the five new tests, which is what
showed they test the split and not just the happy path.

## Checks

- `pnpm lint` at `--max-warnings 0` and `tsc --noEmit` for `packages/ui` and
  the playground, clean.
- `packages/ui` 1202 and `apps/docs` 65 unit tests.
- Playwright not run locally, by request. New or changed on this push: the
  Uses table scroll and step sheet, the colour format sheets inside the shade
  and picker sheets, the export dialog's colour format, and the elevation
  shadow colour on desktop and phone.
