# Blueprint Vault

Blueprint Vault is a monorepo for developing the Blueprint design system and
testing it in real applications. It currently contains an OKLCH colour-palette
laboratory, shared design tokens, an Astryx theme bridge, and an early shared
Button component.

Blueprint is still in development. The current applications are internal tools
and documentation, not production products.

## Repository structure

```text
apps/
  docs/         Blueprint design-system documentation
  playground/   OKLCH palette experiments and live component previews
packages/
  ui/           Shared tokens, theme bridge, components, and colour engine
  eslint-config/
  typescript-config/
```

`apps/playground` contains palette generation and colour experiments.
Product-specific pages, content, layouts, and business logic should live inside
their own application.

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
in `packages/ui/src/color`. Playwright covers the main palette-workspace flows,
including navigation, persistence, reset behaviour, shade-count changes,
lightness editing, colour-track actions, WCAG results, responsive layouts, and
the resizable settings panel.

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

The documentation application and shared component library are still early.
Button is the first documented shared component. New shared components should
be added only when a real product demonstrates a reusable need.

## Current roadmap

The next priorities are:

1. Add [colour-vision simulation and an exportable accessibility report](docs/roadmap/colour-vision-simulation.md).
2. Build the [Typography Studio](docs/roadmap/typography-studio.md) for creating,
   previewing, validating, and exporting a shared type scale.
3. Add GitHub Actions to run tests, lint, type checking, builds, and Playwright
   checks automatically.
4. Document the core foundations: colour, typography, spacing, shape,
   elevation, and accessibility.
5. Define the first product scope before creating a product application such as
   `apps/ferre`.

The completed shared-format, anchor, and manual-edit milestone is documented in
[Colour formats and anchors](docs/roadmap/colour-formats-and-anchors.md).
