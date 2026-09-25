# 2026-09-25 — Component radius, custom elevation levels, and type role presets

Thirty-nine commits on `feat/component-radius`, kept local and pushed together
to save CI runs. Three features and a run of polish across the Radius,
Elevation and Typography studios.

## Key changes

### Component radius

- **Button, Input and Chip radius** are radius uses beside Surface radius
  (the card's), in the Radius studio's Uses table. Each points at a base
  radius per preview frame, or a typed px, and exports as `--radius-button`,
  `--radius-input` and `--radius-chip`. Defaults are what each control used
  before, so nothing moves until someone picks otherwise.
- **System uses are protected.** The six uses the preview and export rely on
  (container inset, section gap, and the four radius uses) show their name as
  a locked label, and their menu offers only Reset to default. Adding or
  renaming a use cannot take a name another use has, in any case or word
  order: "radius input" beside Input radius becomes "radius input 2". A
  system use missing from a saved project is restored on load.
- **A Preview tab in the Radius studio** shows one assistant card built from
  all four uses (card, chips, field, buttons), in the project's colours and
  type, per preview frame.
- **The site preview uses every one.** Buttons follow Button radius; a new
  newsletter band under the CTA has the page's only field, on Input radius; a
  Popular tag on the featured plan is on Chip radius; feature and quad cards
  became surfaces on Surface radius.
- **Inter is the seed font** for new projects. Geist Sans is not on Google
  Fonts, so a new project had nothing to load.

### Elevation

- **One level at a time.** A level is picked on the canvas and the inspector
  shows only it: name, its `--shadow-…` variable, a description, the shadow
  colour, and its light and dark pads. It used to stack every pad for every
  level in one scrolling column.
- **Custom levels.** Add level appends one, seeded between Medium and High;
  it can be renamed (its variable follows) and deleted. Low, Medium and High
  can be described and retuned but not renamed or deleted.
- The canvas shows each level as a square card on a light and a dark ground,
  joined into one tile, with its words beside it.

### Typography

- **Role presets** on the Groups tab: App UI, Minimal, Editorial and
  Enterprise. A preset swaps the groups and roles and keeps the fonts and the
  scale. The matching chip is marked; any change shows Custom. From a preset
  another applies at once; from Custom it asks first, since the studio has no
  undo.
- **Size names past xl** (`2xl` to `5xl`), so a size group holds nine and a
  sixth role is no longer a bare `6`. Role names show lowercase, as their
  tokens are written.

### Structure

- `ScaleStudio` split into `ScaleInspector`, `ScaleCanvas`, `ScaleToolbar` and
  `ScaleSettingsPanel`, from 376 lines to 232.
- One naming rule, `token-names.ts`, for layout uses and elevation levels.

## Architectural decisions

- **Component radius as Uses rows, not a new section.** The Uses table
  already bound a name to a base radius per frame, exported it and injected it
  into the preview. A separate Components section would have been a second way
  to say "this radius goes on that thing", and a `--radius-card` beside the
  existing `--radius-surface`.
- **Fallbacks in the `var()`, not on `:root`.** `var(--radius-button,
var(--radius-element))`: a root declaration resolves at the root, and a
  preview that sets its own element radius would inherit the studio's px.
- **Presets follow the naming rule.** Every load renames a group's roles by
  position, so a preset's ids come from that rule: a size group of three is
  `md`, `sm`, `xs`; a lone display role is `display`; the support roles are
  each a group of one. Any other ids would be renamed on the next reload and
  the preset would read as Custom. Detection names the current system by the
  same rule and compares by value, so a fresh seed and a reloaded project read
  alike.
- **Every preset keeps the five groups a load restores** (display, h, body,
  label, caption), for the same reason.

## Lessons learned

**Astryx's theme sets heading and paragraph fonts by variable.** The radius
card was set in the project's font while its title and subtitle stayed Inter:
the neutral theme gives every `h1`–`h6` `--font-family-heading` and every `p`
`--font-family-body`, which the studio points at its own face. A scoped
preview has to set those variables, not only `font-family`. The spec had
checked the card's own font, which was right all along; it now checks the
text elements.

**The load path is the spec.** Two preset designs looked right and failed a
reload test: roles in a different key order (JSON text compare), and an
Editorial preset without a label group, which the loader adds back. Both were
found only by saving and reading back, which is now a test for every preset.

**A dev server is not a CI.** Full runs against `pnpm dev` failed a different
handful of navigation and load tests each time; a single navigation measured
5.3s against a 5s wait. Against a production build, as CI runs, 453 of 454
passed. For a full run, build.

**Say when a brief does not fit the model.** Several briefs named ids,
fonts or tokens the codebase does not have (`--font-family-primary`,
`body-lg`, a Support group keeping `label`). Building them as written would
have passed review and broken on reload or rendered in the wrong face; each
was built the way the model works and the difference reported.

## Checks

- `pnpm lint` at `--max-warnings 0`; `tsc --noEmit` for `packages/ui` and the
  playground.
- `packages/ui` 1280 and `apps/docs` 65 unit tests.
- Playwright against a production build: 453 of 454. The one failure,
  "closes only the sheet that is sliding away when Escape comes early", came
  with PR #159 and is timing-based; not touched here, not retried.

## Left to do

- The newsletter band's illustration: the SVG arrived as text, not a file.
  Saved into the repo, it can be converted to token colours by script like
  the other landing art.
