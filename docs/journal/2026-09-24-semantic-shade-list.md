# 2026-09-24 — The semantic colour chip opens one shade list

On a wide screen the Semantics chip opened a popover with two selectors: a
track, then a weight. It now opens the list a phone already had: every shade,
grouped by track, with a swatch and a search. Follows the CLAUDE.md phone rule
that one searchable list beats chained selectors, applied at every width.

## Key changes

- **One list instead of two selectors.** Typing "primary 500" and clicking
  picks it. A missing-reference warning ("track gone") has its own row above
  the search.
- **It opens on the chosen shade,** centred, and with the search focused, on
  every open rather than only the first.
- **It reads as a dropdown.** The popover has no padding of its own; a header
  row holds a magnifier and a borderless search over a full-width line, and
  the list below scrolls against the popover's edge. Rows are 36px with room
  around them, and the popover is 280px wide.
- **The token count** sits at the right end of the Semantics toolbar.

## Architectural decisions

- **The chip stays the trigger; Astryx `Selector` does not replace it.** The
  table moves between cells with the arrow keys by focusing
  `[data-semantic-cell]` elements, and skips any key pressed on a
  `role="combobox"`. A `Selector` trigger is a combobox with none of those
  attributes, so it would have cut the column out of keyboard navigation.
  The chip keeps its button, name and data attributes; only what it opens
  changed.
- **One list component for sheet and popover.** The phone sheet's list moved
  out of `SelectorSheet` into `SelectorOptionList`, with a `density` prop:
  `comfortable` rows are 44px for a thumb, `compact` rows are a dropdown's and
  scroll inside a fixed height. The two cannot drift in grouping, search or
  selection.
- **Search in the caller's state.** The list's query belongs to whoever opens
  it, so a closing popover or sheet can clear it and the next open starts
  from every shade.

## Lessons learned

**Astryx overlays keep their content mounted while closed.** Popover and
BottomSheet hide their content rather than unmount it. So "when the list
appears" is not a mount: a mount effect centred the first open and never the
next, and `TextInput`'s own auto-focus, which also runs on mount, left the
second open with typing going nowhere. A hidden list has no height, so a
`ResizeObserver` sees every open as the height going from zero to something,
and both centring and focus run there. A search that narrows an open list
changes the height but never to zero, so it does not re-centre.

**Scroll the list, not the page.** `scrollIntoView` scrolls every scrollable
ancestor, which under a popover means the table jumps. The compact list sets
its own `scrollTop` from two bounding boxes; only the phone sheet, where the
sheet is the scroller, uses `scrollIntoView`.

## Checks

- `pnpm lint` at `--max-warnings 0`, `tsc --noEmit` for the playground, and
  `packages/ui` 1202 and `apps/docs` 65 unit tests, all clean.
- Playwright not run locally, by request. Changed on this push: the chip
  spec in `semantic-table.spec.ts` now searches, picks, reopens and expects
  the chosen shade in view; two specs in `semantic-editor.spec.ts` pick
  "primary 100" from the list.
