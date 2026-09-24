# 2026-09-24 — Tones that follow the brand colour

Every track in a palette has its brand colour locked at the weight it was
measured at: primary at 300, secondary at 700, and so on. The semantic seed
ignored that. `TONES` wrote `fill: [500, 450]` for nearly every tone, so a pale
brand colour got a mid-tone button and somebody had to repoint the fill, hover,
active, surface, edge and label by hand, per tone.

## What changed

- **Contrast profiles** (`contrast-profiles.ts`). `standard`, `high-contrast`
  and `subtle` set how far hover and active step from the fill, the soft
  ground's alpha, and the edge's weight. `standard` is exactly what the seed
  did before, so a palette that chooses nothing gets the layer it always got.
- **The fill follows the locked source.** A seeded tone's light fill is its
  track's `anchorType: "source"` shade. The dark fill keeps the tone's own
  offset from it: a step lighter for most, a step darker for warning. Hover and
  active step darker in light mode and lighter in dark, snapped to weights the
  track has. They are kept apart when the snap would merge them, and they turn
  round at the end of the ramp. The neutral action stays black on light and
  white on dark, because its fill spans the ramp and follows no brand weight.
- **Add tone.** `generateToneFamily` builds the same eight tokens a seeded tone
  has, through the same code, for any track and base weight. The Semantics
  toolbar's Add tone dialog (a sheet on a phone) adds them in one step, and
  refuses the whole family if a name is taken. A bare name joins the `action`
  group. The table groups by the text before the first dot, so a bare `accent`
  family would otherwise have been seven groups of one.
- **Sync with palette anchors.** `syncTonesWithAnchors` re-aims the seeded
  tones still in the layer. It says how many tokens will move before it moves
  them, and leaves names, removed tones and added tones alone. It is one step
  of the undo history.

## Two decisions worth knowing

**The profile's contrast target is reported, not enforced.** The label on a
fill is whichever end of the neutral track reads better on it, which is
already the most contrast the palette allows without moving the fill off the
brand colour. Moving it off is the one thing a tone seeded from the brand
colour must not do, so the dialog shows the measured ratio against 4.5:1 or
7:1 and marks it when it falls short.

**Subtle's 350 edge is below a boundary's 3:1 on a light canvas.** That is the
point of the profile, and it is why the edge moves with the profile rather than
staying at the one weight, 450, that clears 3:1 on both canvases.

## Two tests that measured the old seed by accident

`preview-assessment.test.ts` and `accessibility-report.test.ts` each seeded a
success track at #802020 to get a pair that clears AA and falls below it under
deuteranopia. That pair was borderline only because the fill sat at 500. With
the fill on the source, which for that colour is 600, it cleared AA with room
to spare and the simulation tests lost their subject. The fixtures now seed
#984742, the colour the track's 500 used to be, whose source lands on 500.
The tests measure the same pair as before, on purpose now rather than by
accident.
