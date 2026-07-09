# Blueprint Vault - Design System Workspace Rules

These guidelines are automatically applied to all tasks performed within this repository.

## 🚀 Project Overview & Commands
This is a Monorepo workspace engineering an advanced OKLCH-based dynamic color palette studio.
- `apps/web`: Next.js web application (The design playground and live preview lab).
- `packages/ui`: Shared component library containing core mathematical engines and primitive tokens.
- Tech Stack: React, TypeScript, Tailwind CSS v4, and Astryx UI elements.

### Build & Development Commands
- Start local development server: `pnpm dev`
- Build production bundle: `pnpm build`
- Run code linter: `pnpm lint`

---

## 🎨 Strict Code Style & Design Token Rules
We absolutely DO NOT use standard Tailwind raw utility colors (e.g., `bg-orange-500`, `text-blue-600`) or hardcoded hex strings inside core components. All themes must adhere to our custom **Stable 25-Interval Grid** computed via OKLCH space.

### Token Rules:
1. **Format:** CSS variables must follow this structure: `var(--color-{track_name}-{suffix})`
2. **Interval Suffixes:** Suffixes are strictly constrained to numbers divisible by 25 (e.g., 50, 75, 100, 125, ..., 950). Never invent non-25 intermediate steps.
3. **Boundary Safety:** 
   - Suffix `50` is strictly guaranteed as the lightest perceptual shade (best for canvas backgrounds).
   - Suffix `950` is strictly guaranteed as the darkest perceptual shade (best for main typography headers).
4. **Intermediate Densities:** Since steps between 11-21 can be dynamic, intermediate values might drift. When binding variables to Astryx UI elements, always declare component tokens locally using inline style overrides with fallback cascades.

---

### Tailwind v4 Compilation Rules
1. **NO `tailwind.config.js`:** We use CSS-first configuration. All theme utilities are declared inside `packages/ui/src/theme.css` under the `@theme` directive.
2. **Dynamic Utility Classes:** To add custom colors dynamically at runtime, leverage theme tokens variables (`bg-primary-600`, `text-neutral-950`) rather than arbitrary values like `bg-[var(--...)]`.

### CLI & Workflow
- CLI: Run every command as `pnpm exec astryx <cmd>` (e.g., `astryx build`, `astryx template`, `astryx component`).
- Setup: Ensure app entry (e.g., `main.tsx`) imports:
  ```typescript
  import "@astryxdesign/core/reset.css";
  import "@astryxdesign/core/astryx.css";
  ```
- Workflow:
  1. `astryx build "<idea>"` — Discover closest page, blocks, and components.
  2. `astryx template <name> [--skeleton]` — Study/scaffold reference layout.
  3. `astryx component <Name>` — Lookup component props and examples.

### Astryx Layout & Styling Rules
- **No `<div>` for layout/spacing:** Components must handle all layout/spacing. Use `AppShell` for full pages, `SideNav` for sidebar navigation, or `Layout`/`LayoutPanel`. Frame first and budget regions in `px` before writing content.
- **Data presentation:** Edge-to-edge rows (`Table`, `List/Item`) for dense data. Never wrap list items in `Card`s. Use `Card` *only* for dashboard widgets, galleries, or settings groups.
- **Status indicators:** Use `StatusDot`/`StatusToken` for status. Use `Badge` only for counts and enumerated states (never decoration).
- **Custom styling:** Always prioritize component props. If custom styles are needed, use `style` or `className` with tokens (e.g., `var(--color-*)`, `var(--spacing-*)`, `var(--radius-*)`). Do not use raw hex/px values or Tailwind/StyleX utility/xstyle classes where not mapped.
- **Tokens & Themes:** Accent/brand changes must go through `astryx theme`. Do not override `--color-*` in `:root` manually.

<!-- ASTRYX:START -->
Astryx v0.1.3 · 149 components
CLI: run every command as `pnpm exec astryx <cmd>` (shown below as `astryx ...`).

SETUP (once, in your app entry e.g. main.tsx) — without these, components render unstyled:
  import "@astryxdesign/core/reset.css";
  import "@astryxdesign/core/astryx.css";

WORKFLOW — discover, don't guess. Before writing UI:
1. `astryx build "<idea>"` — START HERE: returns a kit (closest [page] + [block]s + [component]s). No args = full playbook.
2. `astryx template <name> [--skeleton]` — scaffold the [page]/[block]s it named, or study their layout. Templates are reference code.
3. `astryx component <Name>` — props + examples for every component you use.

RULES:
- No <div> — components do all layout/spacing. Full page → AppShell; sidebar nav → SideNav.
- Frame first: pick the shell (AppShell / Layout+LayoutPanel) and budget regions in px BEFORE writing content (`astryx docs layout`).
- Dense data = rows (Table, List/Item) edge-to-edge — never Card-wrapped list items. Card = dashboard widgets, galleries, settings groups only.
- Status → StatusDot/Token; Badge only for counts and enumerated states, never decoration.
- Custom styling: component props first; else style/className with tokens — var(--color-*|--spacing-*|--radius-*). No raw hex/px. (No StyleX/Tailwind compiler here — don't use xstyle/utility classes.)
- Tokens for every value (`astryx docs tokens`). Brand/accent via `astryx theme` — never override --color-* in :root.

MORE CLI:
  search "<query>"   find any component / hook / doc / template / block
  component --list   149 components by category
  template --list    page + block recipes
  docs <topic>       color, elevation, icons, illustrations, layout, migration, motion, principles, shape, spacing, styling, theme, tokens, typography
  swizzle <Name>     eject component source for deep customization
  upgrade --apply    run after any @astryxdesign/core bump
<!-- ASTRYX:END -->
