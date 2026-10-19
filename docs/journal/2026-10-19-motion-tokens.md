# 2026-10-19 — Motion tokens, and a studio to tune them

Ten commits on `feat/motion-tokens`, cut from `main` after the HSL branch merged. A
workspace has a motion scale (durations and easing curves), five presets seed their
own, every export and the handover carry it, undo and redo reach it, and a Motion
studio at `/motion` plays real controls on the scale and tunes it.

## Key changes

- **The scale.** `packages/ui/src/motion/`: `DurationToken` (id, name, whole ms),
  `EasingToken` (id, name, four curve numbers, and the CSS written from them) and
  `MotionScale`. The defaults are five paces (instant 100 to slow 500ms) and four
  curves (standard, decelerate, accelerate, emphasized). Reading a scale makes ids safe
  to use as a custom property, holds a duration to 0 to 10,000ms, holds a curve's x to
  0 to 1 (CSS drops the whole declaration otherwise), writes `css` from the numbers
  and refills a damaged family without touching the other.
- **In the workspace.** `WorkspaceProject.motion`, filled with the default when
  absent, so every older file and stored workspace reads as it did. The Colour
  studio's list of the slices it hands its export gained it; without that, a project
  file exported from Colour would have lost its motion.
- **Presets.** Carbon seeds its six published durations (70 to 700ms) and its
  productive and expressive curves, checked against its documentation. Linear (80 to
  200), Polaris (100 to 500), Primer (150, 200, 300) and Stripe (150, 250, 350) seed
  durations and keep the default curves. The other presets keep the default scale.
- **Exports and the handover.** CSS, Tailwind and Design Tokens carry motion from every
  studio, and so does the handover, whose README says so. The Tailwind file declares
  the theme and an `@utility duration-<id>` for each duration; a test compiles it with
  Tailwind v4 and finds `.duration-fast` and `.ease-standard`. The docs app's generated
  files were regenerated.
- **History.** Motion is one of the parts an undo owns, and an undo made from another
  studio goes to `/motion` to show it.
- **The studio.** A rail entry and an easing-curve icon. The toolbar has undo and redo,
  a 1x, 0.5x and 0.25x speed, Replay and Reset. The stage is a button, a switch, a
  dropdown and a dialog, each saying which token it plays. The settings are a duration
  (token, slider and a millisecond field in steps of 25) and an easing (token, five
  presets, a curve editor with draggable handles, four typed numbers, and a live
  preview). Shift holds a handle to its guide. A whole drag or run of typing is one
  step in the history. On a phone the settings are a sheet.
- **Tests.** Unit tests for the scale, its reading, the exports, the presets, the file
  and storage round trips, the history and the editing rules; 32 end-to-end tests for
  the studio. Each rule was broken once on purpose and failed.

## Architectural decisions

- **The stage drives Astryx through its own properties.** Astryx's compiled CSS reads
  `--duration-fast`, `--duration-medium` and `--ease-standard`, so the stage sets
  those three from the scale and the controls inside move on it. A press is its fast
  band, a panel its medium, a dialog its slow. A test confirms an Astryx control
  transitions for the token's duration. The dropdown panel and the dialog are drawn
  here from Astryx pieces, because Astryx's own open in the top layer, outside the
  stage; the dialog sets the properties again on itself.
- **A scale's names are its own.** Carbon's tokens are `fast-01` to `slow-02`, Primer's
  are three. So the stage asks for a moment by what it is and gets the token of that
  name where there is one, and else the token at the same place in the ramp.
- **The rules are in `packages/ui`.** Presets, setting a duration or a curve, the
  curve text, the drawing geometry, snapping, speeds and the stage's choice of token
  take a value and return one, so they are tested there and the components draw.
- **The format stays at version 8.** A bump needs a changelog entry and a release, and
  while nothing but a preset can set motion, an older build loses nothing it could
  have been shown. When the studio ships, it should be 9.
- **The stage honours reduced motion**, as Astryx does, and says so. The live preview
  still plays when pressed, because showing motion is what it is for.

## Lessons learned

- **A control that looks like it follows a system may not.** The studio's own Button
  carried a fixed `duration-200` and ignored the scale, while Astryx's Switch beside it
  followed. Measuring the computed transition of each, at rest, hovered and pressed,
  found it; the cause was a class in a file nobody had thought of as motion. The Button
  now runs on `--duration-fast` and `--ease-standard`, which changes every Button in
  the app slightly. Other components still use Tailwind's plain `transition-colors`.
- **A test that waits for "hidden" cannot see a thing that was briefly shown.** The
  first test that Replay leaves the dialog shut passed with the dialog's replay put
  back, because the dialog opened and closed itself. It now watches the overlay for any
  opening.
- **An attribute set to `true` is the string `"true"`.** Several of my own checks
  expected an empty one.
- **Reset goes back to the default scale, not a preset's.** The project does not record
  which preset it started from, so a workspace made from Carbon resets to the studio's
  default. A stored preset id is the follow-up that would make it a true reset.
- **The suite runs with reduced motion on**, which Astryx honours, so a test of
  something moving has to turn it off for itself.
- **A route compiles on first visit in development**, which a rail click must be
  given time for.
