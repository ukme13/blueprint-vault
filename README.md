# Blueprint Vault

Blueprint Vault is a monorepo for developing the Blueprint design system and
testing it in real applications. It currently contains an OKLCH colour-palette
laboratory, a type-scale studio, shared design tokens, an Astryx theme bridge,
and an early shared Button component.

Blueprint is still in development. The current applications are internal tools
and documentation, not production products.

## Repository structure

```text
apps/
  docs/         Blueprint design-system documentation
  playground/   OKLCH palette and type-scale experiments, live component previews
packages/
  ui/           Shared tokens, theme bridge, components, colour and typography engines
  eslint-config/
  typescript-config/
```

`apps/playground` contains the palette workspace (`/`) and the typography
workspace (`/typography`). Product-specific pages, content, layouts, and
business logic should live inside their own application.

`apps/docs` is the home for design-system guidance and component documentation.
The Button documentation is available at `/docs/button`.

## Technology

- Next.js and React
- TypeScript
- Turborepo and pnpm workspaces
- Tailwind CSS v4
- Astryx UI
- OKLCH colour tokens

## Getting started

Requirements:

- Node.js 21.7 or newer
- pnpm 9

Install dependencies and start all development applications:

```sh
pnpm install
pnpm dev
```

The default local addresses are:

- Playground: <http://localhost:3000>
- Documentation: <http://localhost:3001>

Run one workspace only:

```sh
pnpm --filter playground dev
pnpm --filter docs dev
```

## Project checks

Run these commands before opening a pull request:

```sh
pnpm test
pnpm lint
pnpm check-types
pnpm build
pnpm --filter playground test:e2e
```

Vitest covers the reusable colour conversion and palette-generation functions
in `packages/ui/src/color`, and the type-scale generation, role-assignment,
validation, and export functions in `packages/ui/src/typography`. Playwright
covers the main palette-workspace flows, including navigation, persistence,
reset behaviour, shade-count changes, lightness editing, colour-track actions,
WCAG results, responsive layouts, and the resizable settings panel, plus the
typography-workspace flows: creation, persistence, scale editing, and export.

## Colour and token system

The source tokens are in `packages/ui/src/theme.css`.

Primitive colour tracks use a stable 25-interval scale:

```css
--color-primary-25: ...;
--color-primary-50: ...;
--color-primary-100: ...;
--color-primary-150: ...;
--color-primary-950: ...;
```

The recommended `Blueprint 20` preset uses 20 tokens:

- `25` is the lightest token at 97.5% target lightness.
- `50` to `950` continue in steps of 50.
- `950` is always the darkest boundary.

Other experimental scales may use additional suffixes divisible by 25.

The standard semantic status names are:

- `success`
- `warning`
- `error`
- `info`

Use `error`, not `danger`, for colour tracks and CSS variables. A component API
may still use a name such as `destructive` when it describes an action rather
than a colour.

## Accessibility checks

The playground preview evaluates important palette combinations using WCAG 2.2
contrast guidance:

- Normal text: AA at 4.5:1 and AAA at 7:1.
- Large text: AA at 3:1 and AAA at 4.5:1.
- Controls, borders, graphical objects, and focus colours: 3:1.
- White and dark text recommendations for semantic action colours.
- Important semantic text and surface combinations.

The preview also warns when semantic colours are perceptually similar in OKLab
space. Similarity is design guidance, not a WCAG pass or fail. Colour should
not be the only way that an interface communicates meaning.

Focus-colour checks cover contrast with adjacent and unfocused colours. Focus
indicator area, thickness, and placement still need layout and browser review.

Shared components must use Blueprint tokens. Do not use Tailwind's built-in
colour palette or hardcoded hexadecimal colours in shared UI code. Utilities
such as `bg-primary-600` and `text-neutral-950` are allowed because Blueprint
defines those names in `theme.css`.

## Astryx integration

Applications using Astryx and `@blueprint/ui` need the Astryx reset, core
styles, base theme, and Blueprint theme. See
`apps/playground/app/globals.css` for the current import and CSS-layer order.

The Blueprint theme bridge is also defined in
`packages/ui/src/theme.css`. It maps Blueprint semantic tokens to the variables
expected by Astryx components.

Use Astryx layout and component APIs when they fit the interface. Prefer
semantic HTML elements such as `main`, `nav`, `section`, `header`, and `ul` when
they describe the content. A `div` is allowed for layout or grouping when no
semantic element is appropriate.

Useful Astryx commands:

```sh
pnpm exec astryx build "<interface idea>"
pnpm exec astryx component <ComponentName>
pnpm exec astryx docs tokens
pnpm exec astryx docs layout
```

## Shared-code rules

- Keep product-specific code inside its application until reuse is proven.
- Add code to `@blueprint/ui` only when it is product-neutral and has a clear
  shared use.
- Use shared design tokens instead of raw colours.
- Keep palette calculations separate from presentation when extending the
  generator.
- Treat `packages/ui/src/card.tsx` as starter code, not an approved Blueprint
  component.

## Adding a product application

Create a separate Next.js workspace under `apps/<product-name>`. Keep its
branding, content, pages, layouts, and business logic local to that application.

The application can depend on the shared UI package:

```json
{
  "dependencies": {
    "@blueprint/ui": "workspace:*"
  }
}
```

Import the required global styles, then run the normal repository checks.
Move a local component into `@blueprint/ui` only after another real application
needs the same component.

## Current status

The palette workspace currently supports project creation, semantic colour
tracks, direct colour and name editing, drag reordering, colour detail dialogs,
editable lightness values, 10–37 stable shade tokens, live previews, and local
browser persistence. Shared HEX, OKLCH, and RGB preferences apply across colour
pickers and shade details. Users can make exact manual shade changes or promote
them to anchors that smoothly blend the full colour row. Track dialogs provide
transition warnings and a guarded reset for all custom shade changes.

The WCAG 2 mode compares shades with white, black, or a custom colour and
reports normal text, large text, graphics, controls, focus, and semantic-colour
results. Shade details use compact status icons and copy the displayed colour
format without changing the layout.

The export dialog provides CSS variables, Tailwind CSS theme variables, DTCG
design tokens, and editable Blueprint project files. CSS and token exports can
use HEX, OKLCH, or RGB values. A saved Blueprint project can be imported from
the creation screen, or imported into an open project after confirmation.

The documentation application is complete for the foundations. It reads a
workspace file checked into the repository, installs the exported stylesheets
the way a client's developer would rather than importing the studio's own
`theme.css`, and renders six pages from it: colour, semantic roles,
typography, spacing, radius, and elevation. Each carries a table built from the
workspace and guidance written by a person, and each follows the reader's
light, dark, or system choice — the same preference the studio keeps, under one
key, so moving between the two applications keeps it. No page may hardcode a
value: a scanner checks primitive shades, literal colours, measurements, radii,
and typefaces across the whole application, with an empty allowlist.

`pnpm handover <workspace.json>` produces the deliverable. One archive holds
the three export formats, the typography stylesheet, the workspace itself, the
accessibility report in both formats, a README naming every file and which to
install, and the six foundation pages built statically against that workspace —
so the same command documents any client's system. The pages open from a folder
with nothing running. The studio's export dialog offers the same archive minus
the pages, which need a build a browser cannot run.

Button is the first documented shared component. New shared components should
be added only when a real product demonstrates a reusable need.

The [Typography Studio](docs/roadmap/typography-studio.md) first version is
complete. It generates a modular type scale from a base font size, a ratio,
and a step count, then maps the steps to six semantic roles (display,
heading, title, body, label, caption) with editable weight, line height, and
letter spacing per role. It flags common issues, such as body text that is
too small, line height that is too tight, a ratio that grows too fast, or too
many steps. English and Thai live previews use real semantic HTML. Projects
persist locally in the browser, and the scale exports as CSS custom
properties or a Tailwind v4 `@theme` block. Project-file import and export,
fluid typography, and responsive per-breakpoint overrides are not built yet;
see the roadmap document's "Later improvements" for the full list.

The [semantic colour layer](docs/roadmap/semantic-tokens.md) is complete. A
semantic token is a name plus one palette reference per mode, so a name such as
`fg.primary` or `surface.raised` carries a light value and a dark one and moves
whenever the shade it points at moves. A new project is seeded with roles for
foreground, surface, border, action, status, and focus. Each status and action
tone carries a fill, a surface, a foreground, and a border, so an alert or a
button can be built from the layer rather than from a shade number. A saved
workspace gains any role added since it was written the next time it is read,
so the count is a fact about the current seed set rather than about the file.
The Semantics tab edits them as a table, with both modes side by side, and the
layer exports beside the primitives in all three formats. The `/preview` page
draws itself from semantic tokens only, in either mode, and a test proves it
reaches for no primitive.

The [scale studio](docs/roadmap/scale-studio.md) is complete and lives at
`/scale`. Spacing is a base unit, 4px by default and editable, counted out over
an editable step list and exported in rem. Radius tokens are named by use
rather than by size and scale together from one multiplier. Elevation levels
are composite shadows drawn from one palette shade, with opacity held per mode
because a dark surface swallows a shadow, so a level renders correctly in
either mode without changing colour. All three families export beside the
colour and type
tokens, and a workspace saved before they existed opens and gains sensible
defaults.

CI runs lint, type checking, unit tests, and build on every push and pull
request to `main`, with Playwright suites for the studio and for the
documentation on their own paths filters. A merge to `main` additionally
builds a handover archive and opens it from disk, so the command cannot break
unnoticed (see `.github/workflows/ci.yml`).

## Current roadmap

The next priorities are:

1. Define the first product scope before creating a product application such as
   `apps/ferre`. The foundations are documented and handed over; what is
   missing is a decision about what the first product is for, which is the
   thing that will argue the next set of components into existence the way the
   pages argued the token vocabulary into shape.
2. Component documentation beyond Button, driven by that product rather than by
   the component library.

Later improvements to the Typography Studio (fluid typography, responsive
overrides, JSON export, project-file import and export, more presets) remain
open; see [Typography Studio](docs/roadmap/typography-studio.md).

The completed foundations milestone is documented in
[Foundations documentation and the handover](docs/roadmap/foundations-handover.md).
The completed shared-format, anchor, and manual-edit milestone is documented in
[Colour formats and anchors](docs/roadmap/colour-formats-and-anchors.md), and
the completed simulation and report milestone in
[Colour-vision simulation](docs/roadmap/colour-vision-simulation.md).
