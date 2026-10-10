# 2026-10-11 — The navigation bar no longer doubles with the base unit

One commit on `feat/nav-spacing-layout-bindings`. On Spacious / Editorial the
preview's navigation bar stretched: 64px of vertical padding and 48px between
links. The bar now has a layout use of its own for its padding, and a spacing
preset can bind layout uses to steps of its own grid.

## Key changes

- **A new layout use, `inset-nav-y` ("Navigation block inset").** It replaces
  the bare `padding-block: var(--spacing-4)` on the bar. Default: step 4 on every
  frame, the size the bar always was, so nothing changes until a preset or a
  person says otherwise. It is in the Uses table, the export (`--inset-nav-y`),
  the docs' generated files and the spacing overlay's tags. A workspace saved
  without it is healed with the default, and the CSS keeps the old step as its
  fallback.
- **Presets can carry layout bindings** (`SpacingPreset.layout`). 8pt binds the
  bar to step 2 (16px) and the link gap to 1, 2 and 3 (8, 16, 24px); Spacious to
  step 2 and to 1, 2 and 4 (8, 16, 32px). Choosing a preset moves the scale and
  these bindings in one edit (`applySpacingPresetWithLayout`), so one undo takes
  back both. A preset that binds none of them gives them back their default,
  so switching away from Spacious leaves nothing of it.
- **A unit test on every preset** that the steps it binds are steps it keeps,
  and that the bar comes to 16px padding and 24px gaps wherever the grid has the
  step.

## Architectural decisions

- **A named use, not a clamp.** A cap on the bar's height would hide the
  doubling and ignore a binding someone chose on purpose. A use is visible in the
  table, bound per frame, exported, and the person can change it.
- **Bindings live with the preset, not in the use.** A use is bound by the
  _name_ of a step, and a step is a multiple of the base unit, so the same name is
  a different size under each preset. Which names give the chrome the size it
  should have is a fact about the preset's grid, so it is written there.
- **Only the uses a preset names are touched.** Any use a preset binds goes back
  to its default when another preset is chosen; every other use, and a frame the
  preset does not mention, is left as the person had it.
- **Spacious keeps 32px, not 24, for the link gap.** There is no step 3 on its
  grid; 16 and 32 are equally far, and 16px between links is too tight.

## Lessons learned

- **Step names are not sizes.** `var(--spacing-4)` is 16px on the 4px grid and
  32px on an 8px one. Anything that points at a step by name changes size with
  the preset, which is why a single "smaller step" for the gap would only have
  moved the problem to another preset. The landing's CSS has forty more raw steps
  to look at.
- **The bar is still taller on Spacious.** Its padding and gaps are now what they
  were, but the Sign up button's own inset (`inset-control-y`) doubles with the
  base unit and the button is the tallest thing in the bar. That is a decision
  about controls, not the bar, and was left; the test says so.
- **A reload loses the undo history.** The end-to-end test that checks one undo
  takes back the preset and its bindings moves between studios through the rail,
  not by address.
- **The id lists are in many tests.** Adding a system use touched a dozen
  expected lists and the generated docs files; the docs' drift test is what
  caught the export.
