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
`hexToRgb`, `rgbToHex`, `rgbToOklch`, `oklchToRgb` and `oklchToHex`. There is no
LMS space, which is where dichromacy simulation happens. That is the one piece
of genuinely new colour maths in this plan.

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
differently. See the open decisions.

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

1. **The transform, no UI.** RGB to LMS and back, and the four simulations, in
   `packages/ui/src/color/vision.ts`. Pure, and the only stage with real risk
   in it. The matrices must be taken from the published method and cited in the
   source — not written from memory — and the tests must include reference
   values from that source rather than only the properties below.

2. **Properties the transform must hold.** Greys stay grey under every
   simulation. Every output stays in sRGB. Protanopia and deuteranopia collapse
   red and green toward each other while leaving blue largely alone;
   tritanopia does the reverse. Achromatopsia returns a grey of matching
   luminance. Simulating twice is the same as simulating once, since the
   perceived colour is already collapsed.

3. **The preview toggle.** Five options — normal vision plus the four types —
   applied to the rendered swatches only. This is the stage where the rule that
   simulation never touches a token value becomes a test rather than a habit.

4. **Similarity warnings under simulation.** Run the existing OKLab check over
   the semantic pairs at the chosen shade, per deficiency, and surface the pairs
   that collapse. `success` and `error` under deuteranopia is the case the goal
   names and the one to build against first.

5. **The report.** One document combining the existing WCAG results with the
   simulation warnings, as Markdown and JSON, from the export dialog. Both
   formatters join the export guard's list. The report states the WCAG version
   and the simulation method it used, because a report whose method is unstated
   cannot be checked later.

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

## Open decisions

These change the shape of the work and are not mine to settle.

- **Which simulation method.** Viénot, Brettel and Mollon (1999) is the common
  linear approximation for full dichromacy and is simple to implement and to
  cite. Machado, Oliveira and Fernandes (2009) gives severity levels, which is
  what the "anomalous variants" item under later improvements would need — so
  choosing it now avoids replacing the transform later, at the cost of more
  matrices up front. Either way the numbers come from the paper, not from
  recollection, and the report names the method.

- **Which shade the similarity check compares.** Two semantic tracks are twenty
  shades each. Comparing every pair is 190 comparisons per deficiency and mostly
  noise; comparing one representative shade per track is one number that might
  be the wrong one. A middle answer — the shades a component would actually put
  together, such as a surface against its text — is more useful and needs
  someone to say which those are.

- **Whether the simulation mode persists, and whether contrast mode should
  too.** The precedent in this workspace is that a way of looking at a project
  is view state — `previewWidth` and `previewLang` are not persisted — while a
  display preference is kept per device under its own key, as
  `blueprint.colour-format.v1` is. Simulation is closer to the second. If it
  persists, the contrast mode beside it probably should as well, and that is a
  change to existing behaviour rather than part of this feature.

- **Whether the report covers typography.** The workspace now holds a type scale
  and the contrast assessment is already size-aware, so a report that named the
  sizes its verdicts were made at would be more useful than one that did not.
  That is scope growth, and it is the kind that is easier to include from the
  start than to add afterwards.
