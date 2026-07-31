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

- Node.js 20.9 or newer
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
```

Vitest covers the reusable colour conversion and palette-generation functions
in `packages/ui/src/color`.

## Colour and token system

The source tokens are in `packages/ui/src/theme.css`.

Primitive colour tracks use a stable 25-interval scale:

```css
--color-primary-50: ...;
--color-primary-100: ...;
--color-primary-150: ...;
/* optional shades can use any suffix divisible by 25 */
--color-primary-950: ...;
```

The exact number of generated shades can change, but:

- `50` is always the lightest boundary.
- `950` is always the darkest boundary.
- Generated suffixes must be divisible by 25.

The standard semantic status names are:

- `success`
- `warning`
- `error`
- `info`

Use `error`, not `danger`, for colour tracks and CSS variables. A component API
may still use a name such as `destructive` when it describes an action rather
than a colour.

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

## Current roadmap

The next structural work is:

1. Redesign the palette playground around the extracted colour engine.
2. Add shade inspection, accessibility checks, and token export workflows.
3. Define the first product scope before creating `apps/ferre`.
