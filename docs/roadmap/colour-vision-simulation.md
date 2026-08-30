# Colour-vision simulation and accessibility report goal

## Goal

Let users preview how a Blueprint palette looks to people with colour vision
deficiencies, and export a single accessibility report that combines this
simulation with the existing WCAG 2 contrast results.

This extends the palette workspace's accessibility tools. It does not replace
the current WCAG mode; it adds a colour-vision layer and packages both into a
shareable document.

## System model

Colour-vision simulation is a transform, not a new colour format. Given a
shade's OKLCH or RGB value, a simulation function returns the RGB value a
person with a given deficiency would perceive. The palette itself is never
changed by simulation; only the preview rendering is affected.

The simulated types are:

- Protanopia (reduced or absent red perception).
- Deuteranopia (reduced or absent green perception, the most common type).
- Tritanopia (reduced or absent blue perception).
- Achromatopsia (no colour perception, full greyscale).

Simulation logic belongs in `packages/ui/src/color`, next to the existing
`accessibility.ts` and `conversion.ts` modules. It must stay independent of the
playground interface so other applications can reuse it.

## What exists today

Four things this can be built on, and two gaps worth knowing before starting.

**`assessColourSimilarity(first, second)` takes two hex strings** and compares
them in OKLab. Simulation returns a hex, so a simulated pair feeds straight into
the check that already warns about semantic colours being too close under normal
vision. The reuse the goal asks for is a one-line call, not a rewrite.

**The conversions stop short of where this needs to go.** `conversion.ts` has
`hexToRgb`, `rgbToHex`, `rgbToOklch`, `oklchToRgb` and `oklchToHex`, and no LMS
space — which was expected to be the one piece of genuinely new colour maths
here. It was not needed: Machado's published matrices fold the cone-space round
trip in and act on linear RGB directly. See stage 1.

**The WCAG side is already there.** `assessTextContrast`,
`assessTextContrastAtSize`, `assessNonTextContrast`, `assessFocusContrast` and
`contrastRatio` all exist and are tested. The report assembles them rather than
computing anything new.

**The export dialog already has a format switch** — CSS, Tailwind, Design
Tokens, Blueprint Workspace — so the report is another entry beside them rather
than new UI.

**Gap: the contrast mode is not persisted.** `isContrastModeOpen` is component
state, so it resets on reload. The definition of done asks the simulation to
survive a refresh, which would leave two neighbouring toggles behaving
differently. Both modes are persisted in stage 3; see the decisions.

**Gap: the export guard will refuse the report formatters.** The guard in
`packages/ui/src/fonts/export-guard.test.ts` discovers every `format*` the
package exports and fails until each is classified. That is by design and the
new formatters simply have to be added — worth expecting rather than being
surprised by.

## First version

The first useful version should support:

- A simulation toggle in the palette preview with the four deficiency types
  plus a normal-vision baseline.
- Side-by-side or swappable preview of all semantic colour tracks under the
  selected simulation.
- A flag on any two semantic colours (for example `success` and `error`) that
  become perceptually too similar under a given deficiency.
- Reuse of the existing OKLab similarity check already used for normal-vision
  semantic-colour warnings.
- An accessibility report that combines, for the current project:
  - The existing WCAG 2 contrast results (normal text, large text, controls,
    borders, focus).
  - The colour-vision similarity warnings for each deficiency type.
- Report export as Markdown and JSON from the existing export dialog.

## Stages

1. ✅ **The transform, no UI.** The four simulations in
   `packages/ui/src/color/vision.ts`, over a table extracted from Machado,
   Oliveira and Fernandes (2009) into `machado2009.ts` by script rather than
   typed. No LMS space was needed: the published matrices act directly on
   linear RGB, so the only conversion required was the sRGB transfer function,
   which already existed in two private copies and is now exported once from
   `conversion.ts`.

   The extraction is checked three ways. Severity 0.0 is exactly the identity,
   every row of every matrix sums to 1, and reproducing colour-science's
   published doctest from our table reaches their numbers to nine decimal
   places — a source that never saw our parser.

   Severity is carried through the API as planned, tabulated at 0.1 and
   interpolated between neighbours as the authors direct. Achromatopsia is not
   in that paper and is a separate luminance-preserving greyscale, named as
   such by `describeColourVisionMethod` so a report never attributes it to
   Machado.

2. ✅ **Properties the transform must hold.** Landed with stage 1, because the
   properties are how the matrices were checked rather than a pass over them
   afterwards. Greys stay grey. Every output stays in sRGB. Severity 0.0 is the
   identity. Achromatopsia returns a grey of exactly matching luminance, so it
   can neither invent nor hide a contrast failure.

   Two properties this plan asserted were wrong, and the code was right both
   times:

   **Red and green collapse in _hue_, not in overall difference.** Under
   protanopia they land within two degrees of the same yellow, but their
   lightness stays far apart, because protanopia costs red most of its
   luminance. A check on OKLab distance fails on that surviving gap and reads
   as a broken transform, when what it is measuring is the thing protanopia is
   known for. Hue convergence and the red-darkening are separate tests now.

   **Simulating twice is not the same as simulating once.** That holds for the
   projection models — Viénot 1999 collapses onto a plane — but Machado shifts
   cone sensitivities, so a second pass shifts again, by up to 44 levels per
   channel. It is asserted in the negative now, so replacing the transform with
   a projection fails rather than quietly changing what the report cites.

   Every invariant then moved off a dozen hand-picked colours and onto a grid
   through the whole cube, 4096 colours per deficiency, which is what turned up
   two more things the plan would have got wrong:

   **Severity does not move a colour monotonically.** Under tritanopia
   `#00ffdd` is furthest from its original at a severity near 0.2, comes back
   almost to where it started by 0.5, then diverges again — a mid-severity
   tritanomaly displaces it further than full tritanopia does. That is the
   tritan family rather than a defect: the authors derive it over a different
   shift range from protan and deutan and describe it as an approximation. It
   matters for stage 3 if a severity control is ever offered, because dragging
   such a slider right does not always make things worse.

   **The transform is smooth in severity except against the black wall.** A
   mid-tone moves a fraction of a level per 0.01 of severity; a colour with a
   channel pinned at zero moves up to 25 levels over the same step, because the
   sRGB encoding is steep near black and the matrix lifts that channel off zero
   at once. The jump is in the encoding, not the interpolation, so no amount of
   interpolating between matrices will smooth it. Worth knowing before anyone
   animates the toggle.

3. ✅ **The preview toggle, and persistence for both modes.** A five-option
   `Selector` in the preview header, applied to the rendered swatches only.

   Simulation is applied at one place — a `seen()` helper — and only ever on
   the way into a style attribute. Every colour is still chosen from the real
   palette, including the recommended text colour, which is the token somebody
   would ship; the simulation happens at the last step, so what is on screen is
   what a person with that deficiency would see of the real design. The rule is
   now a test: an end-to-end case walks every mode and asserts the stored
   workspace is byte-identical afterwards.

   The WCAG panel keeps measuring the real palette and says so on screen while
   a simulation is active. Contrast ratios are defined on actual colours, and a
   number computed on simulated ones would read as a pass the design does not
   have. Warning about pairs that collapse is stage 4's job and stays there.

   Both view modes now live in `PaletteViewProvider` under
   `blueprint.palette-view.v1`, so `isContrastModeOpen` moved out of component
   state as planned. The parsing is in `packages/ui` and reads tolerantly, per
   field: an unreadable preference costs a click, so it falls back rather than
   throwing, and a release that adds a third mode will not reset the two
   already stored.

4. **Similarity warnings under simulation.** The pairing question is already
   answered in the code: `PalettePreview` picks an action shade per track with
   `shadeAt(track, progress)` and compares four named pairs — success/warning,
   success/error, warning/error, primary/info. Simulation reuses exactly those,
   per deficiency, rather than inventing a second notion of which shades matter.

   Those pairs and the `shadeAt` helper are domain logic living in a component,
   so this stage moves them into `packages/ui` first and has the app read them.
   That is the smaller half of the work and the part with tests.

5. **The report.** One document combining the existing WCAG results with the
   simulation warnings, as Markdown and JSON, from the export dialog. Both
   formatters join the export guard's list. The report covers typography as well
   as colour: the contrast assessment is already size-aware, so a verdict that
   names the size it was made at is worth more than one that does not, and the
   workspace already holds the type scale to name.

   The report states the WCAG version and the simulation method it used —
   including the severity — because a report whose method is unstated cannot be
   checked later.

Stage 1 carries the risk and lands with nothing consuming it. Stage 3 is where
the safety rule about token values becomes enforceable, and is worth writing
before stages 4 and 5 rather than after.

## Later improvements

After the first version is stable, consider:

- PDF export of the accessibility report.
- Anomalous (partial) colour-vision variants, not only full dichromacy.
- Per-component report scope, for example only the tracks used by a specific
  Astryx component.
- A shareable report link or saved snapshot, separate from the live project
  file.
- Colour-vision simulation of uploaded screenshots or live component previews,
  not only flat swatches.

## Safety and quality rules

Simulation is design guidance, not a WCAG requirement. The report must state
this clearly, the same way the current OKLab similarity warning does, so
teams do not treat it as a pass or fail gate.

Simulated previews must never change the underlying token values. Simulation
runs only on the rendered preview colour; exported CSS, Tailwind, and DTCG
tokens must stay in the real, non-simulated palette values.

The report must state which WCAG version and which simulation method it used,
so results stay traceable if the underlying formulas change later.

## Definition of done

The first version is complete when a user can:

1. Switch the palette preview between normal vision and each of the four
   simulated deficiency types.
2. See a warning when two semantic colours become too similar under a given
   deficiency.
3. Generate a report combining WCAG contrast results and colour-vision
   warnings for the current project.
4. Export that report as Markdown or JSON from the export dialog.
5. Refresh the page without losing the current simulation and report state.

The simulation and report-generation functions must have unit tests. The
preview toggle, warning display, and report export flows must have Playwright
coverage.

## Decisions

These were open when the plan was drafted and have been settled.

- **Machado, Oliveira and Fernandes (2009).** Chosen over the Viénot, Brettel
  and Mollon (1999) linear approximation because it is parameterised by
  severity, which is what the "anomalous variants" item under later improvements
  needs. Taking it now avoids replacing the transform later, at the cost of more
  matrices up front. The numbers come from the paper, not from recollection, and
  the report names the method and the severity.

- **The shades a component actually puts together.** Not every pair, and not one
  representative shade per track. The existing normal-vision check already makes
  this choice — four named pairs of action shades in `PalettePreview` — and
  simulation reuses it rather than inventing a second answer. Stage 4 moves that
  choice into `packages/ui`, where it can be tested and where the rest of the
  domain logic lives.

- **Both view modes persist, per device.** Simulation is a display preference
  rather than view state, so it is kept under its own key like
  `blueprint.colour-format.v1` rather than treated as `previewWidth` is. The
  contrast mode beside it moves with it, so the two behave alike.

- **The report covers typography.** Included from the start rather than added
  afterwards, since the contrast assessment already takes a size and the
  workspace already holds a type scale.

## Still open

- **Which severities the UI eventually offers.** Stage 1 carries severity
  through the API; the first version only ever passes 1.0. Whether anomalous
  variants get a slider, a set of steps, or nothing is a question for after the
  first version is in front of someone.
