# 2026-10-11 — A swatch that clears AA no longer warns

One commit on `fix/contrast-pass-threshold-and-tooltip`. A WCAG 2 swatch showed an
amber bar until 7:1, which is AAA. A pair that cleared AA's 4.5:1 for normal text
was flagged as if it had failed something. The score also said nothing of what it
had to reach.

## Key changes

- **The pass threshold is AA, not AAA.** `contrastStatus` for WCAG 2 now reads
  its two steps from `WCAG_CONTRAST`: red under 3:1, amber from 3:1 up to 4.5:1
  (large text and graphics clear it, normal text does not), nothing from 4.5:1.
  WCAG 3 is unchanged (Lc 45 and 75). AAA is still a grade in the shade's
  details, not a warning.
- **An Info button beside the score** in the WCAG 2 and WCAG 3 popovers
  (`ContrastScoreInfo`) says what the score is held to: "AA requires 4.5:1 for
  normal text (3:1 for large text & graphics). AAA requires 7.0:1", and the Lc
  equivalents for WCAG 3. A button, not a bare icon, so it takes focus.

## Architectural decisions

- **The sentence and the grade share their constants.** `CONTRAST_SCORE_NOTES`
  is built from `WCAG_CONTRAST` and `APCA_LC`, the same values the grades are
  judged by, so the tooltip cannot say 4.5 while the status says something else.
- **A warning is for something that failed.** A swatch is asked to clear AA; a
  pair that does has nothing to flag. A stricter grade is information, shown in
  the details, and does not colour the swatch.

## Lessons learned

- **A threshold copied as a number drifts.** The two steps were `[3, 7]` written
  out in the function while the grades read named constants; the warning went
  on meaning AAA after everything else meant AA. Reading both from one place is
  the fix.
- **A test of what a tooltip says is a test of the constants.** The test reads
  the sentence from the page and compares it to the constants, so changing a
  threshold changes both and the test still holds.
