# 2026-10-12 — A button's variant, and a stroke that takes no room

Three commits on `feat/button-variant-toggle`. A button can be dressed Contained or
Outlined from the inspector; a stroke, which had been shrinking what it was on by
the border it replaced, is now drawn so the element keeps its size; and selecting a
section that spans the page no longer makes it scroll sideways.

## Key changes

- **A Variant control on a button** (Contained / Outlined, a segmented control).
  Contained is the action fill, its label, a light shadow (`low`) and no edge;
  outlined is no fill, plain text, a `border.default` edge and no shadow. All of it
  as tokens, in one edit that one undo takes back, saved with the project
  (`PreviewSlotStyle.variant`). Choosing how the page already draws the button
  clears the variant; the other way starts the pattern clean, dropping the fill,
  label colour, edge, shadow and their eyes, and keeps the room and the shape. The
  panel's Fill, Stroke and Effects show the variant's own values.
- **"Apply type to all buttons".** The action's label now says what it carries: the
  type role, not the fills.
- **A stroke is an outline.** An edge all the way round is
  `outline-width/-style/-colour/-offset` (inside is pulled in by its weight,
  centred by half, outside by none), where it had been an inset box-shadow ring and
  a zeroed border width. The page's own edge, when a stroke is set, taken away or
  closed, gives way by its colour (`borderColor: transparent`) and keeps its width.
  The box-shadow is the shadow's alone. A divider's one-sided edge is still a
  border of that side.
- **The focus ring wins over a stroke.** `[data-preview-slot]:focus-visible` is
  `!important`, since a stroke is now an inline outline.
- **No sideways scroll on a full-width selection.** Each outline sits in a layer
  as wide as what it is drawn in, with its sides clipped and its top and bottom
  open, so the handles that reach 5px past a box cannot widen the page.

## Architectural decisions

- **The variant is the button's base, and what is set on top wins.** Drawing reads
  the variant's fill, edge and shadow where none is set (`previewNativeStyle(id,
kind, variant)`), so a fill chosen on an outlined variant, or an edge on a
  contained one, is the person's and stays. The variant's shadow is a level of the
  elevation scale, since the page's own contained shadow is the button library's.
- **The variant is stored only when it differs from the page.** `withButtonVariant`
  clears it when asked for what the page draws, so a button toggled and toggled back
  leaves no trace in the project.
- **An outline, because nothing else can sit over a border.** A border changes the
  size, and an inset shadow is clipped to the padding box and cannot cover the
  border area. An outline takes no room, follows the corner radius and lies over the
  border edge, so inside, centred and outside are exact.
- **Layers by their sides.** `overflow-x: clip` with `overflow-y: visible` is a
  legal pair; it is what lets the top handle and the size label under a box stay.

## Lessons learned

- **A stroke that replaces a border by zeroing it changes the size.** A contained
  button has a 1px transparent border on each side, so zeroing it took 2px off its
  height (38 to 36). It was seen only when someone looked at the number; a test
  that measures the element's size is what holds it now.
- **Measure a size once the page has stopped moving.** Opening the panel narrows the
  page, and a button's width changes by a few pixels as it does (120 to 126px on the
  hero). A size read on the first frame is a size on the way, so the tests wait until
  it has been still for three reads.
- **A test that matches the library's own value proves nothing.** A shadow test that
  looked for "3px" was satisfied by the button library's `0 1px 3px`; moving the
  stroke out of the box-shadow made that visible and the assertions are now on the
  outline.
- **An outline is a good focus ring and a good stroke, and they are one property.**
  The focus ring has to be `!important` to show over an inline outline.
- **Break each rule once.** The variant's drawing, the outline's size and the side
  clipping were each broken and their tests confirmed to fail.
