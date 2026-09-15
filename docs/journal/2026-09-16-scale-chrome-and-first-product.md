# 2026-09-16 — Scale chrome, and a name for the first product

Two leftovers after Scale #122 and type-preview #123: the spacing canvas
lied about its own layout, and elevation opacity was a stack of identical
Astryx sliders. The README still asked what Ferre was for. This pass
fixes the first two and writes the third down.

## Spacing canvas

Density labels fine steps `grid` so a 2px hairline is visibly not a
layout gap. That word was a fourth child in a four-column row, so the
bar became a fifth and wrapped under the token name as a 2px tick.

The row is now five columns: name, px, rem, a flag cell that is empty
for layout steps, then the bar. Layout bars line up. The flag still
means “this step ignores Density.”

## Elevation opacity

Contact and Cast are the same number — opacity of one shadow colour —
so a shared grey ramp would make four copies. Light and dark sit on
that mode’s surface, with the shadow mixed from 0 to 60%. Contact keeps
`--radius-inner`; Cast is a pill. Same 14px height. No blur: the first
pass collapsed the track to a tick and left the thumbs floating.

The Colour lightness slider is the pattern: `isLabelHidden`, hide the
Astryx fill overlay, paint the track, give the cell `minmax(0, 1fr)`.
Visible labels were `Low contact light` on every row; the group already
says Contact, so the row only says Light or Dark. Accessible names stay.

A dark track on dark studio chrome is invisible unless the slider sits
in a well of that mode’s surface. The well is the canvas; the gradient
mixes the shadow into it, not into `transparent`.

Control heights are still not a family. Density is: it shipped in #122.
The scale roadmap still listed it under later; that line comes off.

## First product

`apps/ferre` was a retired type studio and a README placeholder. The
brief names the job before the folder exists: a bilingual (English /
Thai) public practice site that installs the handover the way docs does,
never `theme.css`. Four screens: shell, home, article, contact. Contact
is where the next component after Button gets argued, and it stays in
the app until a second product needs it.

Stage 2 waits until that job is accepted or replaced in the brief.

## Checks

- Playwright `spacing-studio.spec.ts`: grid label and bar on one row;
  contact vs cast radius; light vs dark track colour; existing opacity
  edits.

## Lessons

**A label that is sometimes missing is still a column.** Optional
children steal the last track. Empty cells keep the bar where it is.

**A slider that paints an axis has to hide its own chrome.** Visible
field labels plus a default-width Astryx track is how the thumbs left
the bar. `isLabelHidden` and a sized well are what the Colour studio
already knew.

**Opacity is not lightness.** Black-to-white is one axis. These sliders
are “this colour on this surface.” Light and dark differ by the well;
Contact and Cast differ by the edge. A grey ramp would erase both.
