# 2026-10-12 — The label on a mid-tone fill is the one APCA reads best

One commit on `fix/on-secondary-label`. On a purple 500 secondary, `fg.on-secondary`
seeded to black: Lc 35, where white has Lc 74. The seed took the first label that
cleared WCAG 2's 4.5:1, and white is 4.2:1 there.

## Key changes

- **When no candidate clears both lines, the label is the best by APCA.** The
  two lines are 4.5:1 and Lc 60. If one candidate clears both it is taken first,
  the role's own track ends before white and black, as before. If none does, the
  label is the candidate with the highest Lc among those that reach 3:1, and if
  none reach that, the best of all. A tie keeps the order.
- **Purple 500 gets white in both modes**: Lc 74 in light (black was 35) and 67 in
  dark (black was 42). A palette whose neutral ends already read is seeded exactly
  as it was: `#7c3aed` keeps its neutral-25 label.
- **Tests**: three on the secondary (white on purple 500 in both modes, the track's
  own end kept where it clears both lines, no white under 3:1) and the property test
  from the static colours rewritten to the new rule. The first fails on the old code.

## Architectural decisions

- **The first fallback changes, not the first choice.** A label that clears both
  lines has nothing to argue about, and taking it first keeps every palette that
  already read as it was. Only the case that picked on the ratio alone, which is
  where the two standards disagree, moved.
- **A floor of 3:1 under the APCA pick.** On a light violet white has the higher Lc
  at 2.7:1 and black reads at 7.7:1. The Lc is not the whole story where WCAG 2 sees
  almost nothing, so APCA chooses among what WCAG 2 still calls readable for large
  text and graphics (3:1, `WCAG_CONTRAST.largeTextAA`) and only past that, among all.
- **Pure white and black are candidates, not a rule.** They come after the role's
  own ends, so a palette's neutral still gets to be the label when it reads.

## Lessons learned

- **The tier after "both lines" was a ratio rule in disguise.** "Clears the ratio
  only" ranked a label with Lc 35 above one with Lc 74. Where the standards disagree
  the one that matches what the eye sees should lead, and the ratio's bias toward
  black on mid-tones is exactly that disagreement.
- **A property test states the policy.** The old one held "tier 1 beats tier 0"; it
  failed the moment the policy changed and had to be rewritten to the new rule, which
  is what it is for.
- **Choose the examples that sit on the edge.** Purple 500, a deep violet and a light
  violet are each on a different side of the 4.5:1, Lc 60 and 3:1 lines; the three
  tests are those three.
