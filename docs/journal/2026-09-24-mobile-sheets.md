# 2026-09-24 — The playground on a phone: sheets instead of popovers

A summary of the mobile work on `fix/mobile-layout`. The round-by-round detail,
with its measurements and the bugs each round found, is in
`2026-09-23-mobile-layout.md`.

## One pattern: a sheet from the bottom edge

At 640px and below, anything that used to float over the page now rises from
the bottom edge as a sheet, with a backdrop. Tapping the backdrop, swiping down
or pressing Escape closes it.

- **Colour.** The WCAG 2 and Vision chips open settings sheets that edit a
  draft (Reset / Apply), and the toolbar stays one line of chips that swipes.
  A shade, a track's details, and the colour picker opened from either are
  sheets, and the picker stacks on the sheet it was opened from. Reset preset
  is an icon, and it asks first.
- **Typography.** The specimens get the whole height. The Settings / Groups /
  Warnings inspector opens from a toolbar button with a warning badge. Groups
  fold into an accordion, move with ▲/▼ instead of a drag, and show each role
  as a card of captioned fields, with Add role at the bottom and a confirmation
  before a group is deleted. The preview's colour and text-preset selectors
  open as sheets.
- **Spacing, Radius, Elevation.** The same pattern: the canvas has the whole
  width, and the inspector opens as a sheet from the toolbar.
- **Export.** The dialog is one column. The formats are a line of chips that
  swipes, and the code preview and Download take the full width.
- **Preview.** Only the phone frame, and Reset to default is an icon.

Desktop keeps its popovers, dialogs and side panels throughout. The phone
versions are chosen by `useIsPhone()`, and every sheet is `Sheet`, the one
component that wraps Astryx's `BottomSheet`.

## Home

On a phone the header is two rows: "Projects" with its capacity pill, then New
project and Import project as two equal buttons. While the library has room, a
dashed "Create new workspace" card ends the grid. A redesigned project card
with a `···` menu was tried and reverted, because the earlier card, with its
icons over the mosaic, was preferred.

## What the sheets taught us

Most of the bugs came from four places. `Sheet` handles all four now:

1. **A sheet inherits from where it sits in the DOM**, even though it is drawn
   in the top layer. One opened from the palette toolbar inherited `nowrap`,
   and its text ran off the edge.
2. **Astryx's grab handle floats over the first 24px** of a sheet, with a fade.
   Content there looks washed out, and the handle takes the taps meant for
   controls under it.
3. **A sheet inside a sheet gets the same Escape.** Astryx closes a sheet from
   a React keydown, so without a stop, Escape closed both.
4. **Astryx moves menus out of any `span` above them**, and inside a modal
   sheet that makes the menu inert. The format menu showed and could not be
   tapped. Wrappers are `div`s.

And one about tests: the drag guard on the colour field looked unnecessary
after a single passing run. Three runs without it showed a one-in-three
failure. A timing-sensitive test needs several runs, with and without the fix,
before any code is called dead.

## Known flakes

Under a full parallel run against `pnpm dev`, a few tests fail and then pass
alone, most often "Where a Selector menu opens › stays against it with no room
below". They look like dev-server compile time. They are not caused by this
branch, but they are worth a look on their own.
