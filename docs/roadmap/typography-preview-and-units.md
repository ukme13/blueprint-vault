# Typography preview and units plan

## Goal

Make the typography studio useful for judging a scale, not only for generating
one. Today it answers "what sizes did I get". It should answer "does this scale
work in real text, in the scripts I ship, on the colours I ship".

Reference for the interaction patterns: Typescale (typescale.com). The patterns
are worth borrowing; the visual design is not. Everything here is built from
Astryx components and Blueprint OKLCH tokens, and no raw hex enters a component.

This extends `typography-studio.md`. Several items below already appear in its
"Later improvements" list.

## Why now

Reviewing the current studio against that reference turned up one defect and
three gaps:

- **Export is px-only.** `formatPx` in `packages/ui/src/typography/export.ts`
  stamps `px` on every size, in both the CSS and Tailwind output. `px` font
  sizes ignore the reader's browser font-size setting; `rem` respects it. For a
  tool whose output other people ship, that is the wrong default.
- **Specimen text is fixed.** Users cannot preview their own copy, which matters
  most for Thai, where the studio already claims to help.
- **The preview is a specimen list.** One `<article>` per role. It does not show
  the scale doing a real job.
- **Preview colours are unrelated to the palette.** The workspace generates an
  OKLCH palette in the next tab and the typography preview cannot use it.

## System model

Three ideas, kept separate so they can ship independently.

1. **Unit is a presentation concern.** The scale is stored in px and converted at
   the edges — preview and export. Nothing in the engine changes shape.
2. **Specimen text is project data.** It persists with the project, like the font
   family, because it is part of what the user is evaluating.
3. **A preview template is a layout, not content the engine knows about.**
   Templates live in `apps/playground/components/typography`. They consume role
   tokens and know nothing about scale maths.

## Stage 1 — Units ✅ done

Add `rem`, `px` and `pt` output. Engine work plus one control.

- `TypeScaleUnit = "rem" | "px" | "pt"` in `types.ts`.
- Replace `formatPx` with a unit-aware formatter in `export.ts`.
- Conversions, from the stored px value:
  - `rem` — divide by the root font size, default **16**. This is the browser
    default root, not the scale's own base size. A scale with base 18 correctly
    yields `1.125rem` for body.
  - `pt` — multiply by `0.75` (96 px/inch against 72 pt/inch).
  - `px` — unchanged.
- Line-height stays unitless. It is already correct.
- Letter-spacing converts with the same unit. `em` is arguably better for
  letter-spacing because it tracks the size it is applied to; that is deliberately
  out of scope here and noted under later improvements.
- Show the unit in the preview next to each step, as the reference does, so the
  computed value is visible without opening the export dialog.
- Persist the chosen unit with the project.

**Decision taken: `rem` is the default.** It is the accessible choice and the
reason this stage exists. This does change what existing projects export, which
is deliberate. The export dialog says why in one line.

`formatResponsiveTypographyCssExport` was made unit-aware too. Leaving it on px
would have fixed the defect in the main studio while leaving it in the Ferre
studio — the same output, half corrected. The media-query breakpoint stays in
px: a viewport width is not a type size.

Unit tests: each conversion, rounding behaviour, and that line-height is never
given a unit.

## Stage 2 — Specimen text ✅ done

- A text field above the generated steps, as in the reference.
- Default to the existing English sample. Accept any script.
- Persist with the project.
- Render the specimen at every step, so a single string can be judged across the
  whole scale at once.

This is small, and it unlocks Stage 5.

## Stage 3 — Preview templates ✅ done

Replace the single specimen view with a template picker. Start with three:

- **Specimen** — the current role list, kept as the default.
- **Article** — a long-form page: title, standfirst, headings, body, pull quote,
  caption. Exercises the reading sizes.
- **Marketing page** — hero, section headings, feature grid, small print.
  Exercises the display sizes.

Rules for templates:

- Semantic HTML only, per the existing safety rule: `h1`…`h6`, `p`, `label`,
  `figcaption`. Tokens control presentation; elements keep meaning.
- Content must be written for this project. Do not reproduce the reference
  tool's sample copy.
- Every template ships an English and a Thai version of its content, because a
  layout that works in English can break in Thai.

**Design decision — role to element mapping.** The engine's roles are `display`,
`heading`, `title`, `body`, `label`, `caption`; templates need HTML elements.
Define the mapping once, in a shared module, rather than per template:

```
display → h1     body    → p
heading → h2     label   → label
title   → h3     caption → small / figcaption
```

Add device-width toggles over the preview (mobile, tablet, desktop). The Ferre
studio already has a viewport switch; unify rather than duplicate.

**Two notes from building it.**

The old preview mapped _both_ `display` and `heading` to `h1`, so every specimen
emitted two page titles. The shared mapping fixes that — `heading` is now `h2`
and `title` is `h3` — and a unit test asserts exactly one role maps to `h1`, with
no skipped heading level. A preview that misrepresents the document outline is
worse than no preview.

Template and language are handled differently on purpose. The chosen template
persists with the project, because it is part of what you are designing. Preview
width and language do not: they are ways of looking at the project, not part of
it, so they reset on reload.

## Stage 4 — Preview against the real palette

The reference offers two hex inputs for text and background. Blueprint can do
better, and its own rules forbid raw hex in components.

- Choose preview text and background colours from the current project's palette
  tracks and shades, not from a colour picker.
- Show the WCAG contrast result for the chosen pair, reusing `contrastRatio` and
  the assessment helpers already in `packages/ui/src/color/accessibility.ts`.
- Warn when the previewed body size and colour pair fails, since size and
  contrast interact — WCAG's large-text threshold depends on the font size the
  scale just generated.

This is the item the reference tool structurally cannot copy, and it connects
the two halves of the workspace.

## Stage 5 — Thai-aware validation

`assessLineHeight(lineHeight: number)` takes a bare number and applies one
threshold. The safety rules in `typography-studio.md` say Thai marks need more
vertical space, so the current check does not implement its own stated rule.

- Detect the script present in the specimen text.
- Apply a higher minimum line-height when Thai is present.
- Say which script triggered the warning, so the advice is actionable.

Depends on Stage 2, which is where the specimen text comes from.

## Not doing

- The reference's Boards, Bookmarks, Likes and Explore rail. That is a hosted
  community product; this is a local workspace.
- Its **Body / Headings** two-group model. Blueprint's six semantic roles with
  per-role weight, line-height and letter-spacing are a richer model. Do not
  trade down.
- Its visual design. Patterns only.

## Later improvements

- `em` letter-spacing, which tracks the size it applies to.
- A configurable root font size for `rem`, rather than assuming 16.
- Fluid `clamp()` output, still missing and tracked in `typography-studio.md`.
- More templates: dashboard, documentation, email.

## Safety and quality rules

Changing the unit must never change the stored scale. Conversion happens at the
preview and export edges only, so switching units and switching back is lossless.

Persisted projects must keep loading. `unit`, `specimenText` and `template` are
new optional fields; `readStoredProject` must default them rather than reject a
project saved before this work. No storage-key version bump should be needed —
confirm that before merging.

Preview templates are for judging type. They must never influence the generated
scale, the tokens, or the export.

## Definition of done

1. A user can switch the generated scale between `rem`, `px` and `pt`, see the
   change in the preview, and export in that unit.
2. Exported line-height still carries no unit.
3. A user can type their own specimen text, in any script, and see it at every
   step.
4. A user can preview the scale as an article and as a marketing page, in English
   and Thai, at mobile, tablet and desktop widths.
5. A user can set preview text and background from the project palette and see
   the WCAG result for that pair.
6. A user gets a line-height warning tuned to Thai when the specimen contains
   Thai.
7. A project saved before this work still loads.

Conversion, mapping and validation functions need unit tests. The unit switch,
specimen input, template switch, palette pairing and Thai warning each need
Playwright coverage.
