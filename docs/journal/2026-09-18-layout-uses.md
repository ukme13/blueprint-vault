# 2026-09-18 — Layout uses on Spacing and Radius

PR 126 put preview frames on the workspace and a closed layout table
in Settings. This pass moves the uses onto Spacing and Radius, and
unlocks the list so it behaves like Colour Semantics: add, rename,
duplicate, delete, drag-reorder. No groups, no alpha, no modes.
Columns are the preview frames.

## Settings is frames

The dialog is phone, tablet, desktop, and extra desktops. Width 420.
The layout table is gone. Settings is a `SideNavItem` with the same
cog the other rail rows use, labelled Settings when the rail expands.
Home still opens it from the TopNav.

## Uses

Spacing and Radius each have Scale | Uses. The table is one kind per
page. Add copies pointers from the last row of that kind. Rename
changes the exported custom property with the label. Duplicate lands
directly under the source. Drag uses the semantic row sensors, with
the group check turned off so dash-ids still get a drop gap.

A cell is a hybrid like type: bind a spacing step or radius token, or
type a px. Storage is the primitive id (`4`, `container`) or a length
(`20px`). CSS emits `var(--spacing-*)` / `var(--radius-*)` or the
length. `16px` survives normalize; a bare `16` is still step 16.

`normalizeLayoutTokens` treats a missing field as the seed set, and a
stored array as author data. `[]` stays empty. File version stays 8:
the array was already there.

Undo sits on the scale stack. Pointing inset at another step is a
scale edit, not a settings preference.

## Domain split

`layout-tokens.ts` reads, fills frames, and writes CSS.
`layout-edit.ts` is the mutations the table calls, the same split
radius already had.

The no-jitter name field is `InlineTextCell`. Semantics stay a button
until a deliberate edit so arrow keys still move the spreadsheet;
Uses is always an input. Both boxes are the same height and `size={1}`.

## Checks

- Vitest: `layout-tokens` (open list, hybrid bind / typed px, CSS
  lengths), `scale-history` (layout pointer undo), workspace custom
  `--inset-hero` round-trip, `export-guard` (`formatLayoutRawPx`).
- Playwright: Layout uses add / rename / reload, duplicate / delete,
  drag, bind or type 20px. Settings no longer hosts a layout table.
  `PLAYWRIGHT_BASE_URL=http://localhost:4000`.

Home Stage 3 (retire leftover Colour / Typography create doors) is
still open.

## Lessons

**A closed normalize is a lock, not a default.** Seeds on `undefined`
and pass-through on an array is what lets Add and Delete survive a
reload. Filling every save back to three rows made the table a view.

**`semanticGroupOf` splits on dots.** Layout ids are `inset-container`.
The semantic drop-gap treated every row as another folder, so the
slot never appeared. Same sensors, `() => true` for the group check.

**Astryx TextInput is taller than the label it replaces.** The row
jumps. A native input with `size={1}` and `width: 100%` is the same
box in read and edit. Default `size={20}` overflows the cell.
Astryx’s `td { max-width: 0 }` will clip a wider inner div; do not
lift that cap to make a field fill the column.

**`formatLayoutRawPx` is a public `format*`.** `export-guard` discovers
every one. A value formatter that only writes `20px` still has to be
on the list, or CI fails for a reason that looks unrelated.

**`setState` in `useEffect` is a warning at `--max-warnings 0`.** Reset
the draft when the committed value identity changes, during render.
The row already remounts when rename changes the id.
