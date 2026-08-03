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
