# 2026-10-11 — The text on a fill is chosen by APCA

One commit on `feat/apca-text-recommendation`. `recommendTextColour` and the seed's
choice of label for a fill (`readableEnds`) compared WCAG 2 ratios, which lean toward
black on mid-tones such as an orange, a purple or a blue, where white is the more
legible. Both now compare the Lc of each as the text on the fill.

## Key changes

- **`recommendTextColour` picks by Lc.** The light colour is chosen when its
  absolute Lc as text on the background is at least the dark one's; a tie goes to
  the light colour. The ratios it returns are still WCAG 2's, for the reports that
  state them.
- **`readableEnds` does the same for a seeded label.** Each end of a role's track is
  measured as the text on the fill, and the larger Lc wins.
- **Tests on both**: mid-tone fills where the two methods disagree, ties, and that
  the reported ratios are unchanged.

## Architectural decisions

- **The pick and the report are different questions.** Which colour to recommend
  is a judgement about legibility, which APCA models; the number shown beside it is
  the WCAG 2 ratio people compare to a line. Keeping the ratio WCAG 2's means a
  recommendation can have the lower ratio, and a ratio below a WCAG 2 line is said as
  such wherever it is shown.
- **The same rule in both places.** The recommendation a person sees and the label a
  seed writes are the same decision; they now use the same measure.

## Lessons learned

- **The ratio has a known bias.** It treats the lightness of the two colours
  symmetrically in luminance terms, which favours black on a mid-tone fill. Anything
  that picks "the higher ratio" will pick black there, and the eye disagrees.
- **This met `feat/static-base-colors` (#200) in `readableEnds`.** That branch
  merged first: it takes the first candidate to clear both 4.5:1 and Lc 60, trying
  the role's own ends and then white and black. Resolved by keeping its candidates
  and its two lines, and ordering the candidates by Lc, as this branch does. The
  seed test is changed with it: where the end APCA prefers clears both lines it is
  the label, as before; where it does not (a mid-tone orange, where white has the Lc
  but not the ratio) the label is the one that clears the ratio. `recommendTextColour`
  has no second line and still picks by Lc alone.
