# CLAUDE.md - Design System Workspace Guidelines

## 🚀 Project Overview
This is a Monorepo workspace engineering an advanced OKLCH-based dynamic color palette studio.
- `apps/web`: Next.js web application (The design playground and live preview lab).
- `packages/ui`: Shared component library containing core mathematical engines and primitive tokens.
- Tech Stack: React, TypeScript, Tailwind CSS v4, and Astryx UI elements.

## 🛠️ Build & Development Commands
- Start local development server: `pnpm dev`
- Build production bundle: `pnpm build`
- Run code linter: `pnpm lint`

## 🎨 Strict Code Style & Design Token Rules
We absolutely DO NOT use standard Tailwind raw utility colors (e.g., `bg-orange-500`, `text-blue-600`) or hardcoded hex strings inside core components. All themes must adhere to our custom **Stable 25-Interval Grid** computed via OKLCH space.

### Token Rules:
1. **Format:** CSS variables must follow this structure: `var(--color-{track_name}-{suffix})`
2. **Interval Suffixes:** Suffixes are strictly constrained to numbers divisible by 25 (e.g., 50, 75, 100, 125, ..., 950). Never invent non-25 intermediate steps.
3. **Boundary Safety:** 
   - Suffix `50` is strictly guaranteed as the lightest perceptual shade (best for canvas backgrounds).
   - Suffix `950` is strictly guaranteed as the darkest perceptual shade (best for main typography headers).
4. **Intermediate Densities:** Since steps between 11-21 can be dynamic, intermediate values might drift. When binding variables to Astryx UI elements, always declare component tokens locally using inline style overrides with fallback cascades.


### Astryx UI Component Specifications
We use `@astryxdesign/core`. Here are the strict primitive signatures:

1. **Button Component (`@astryxdesign/core/Button`)**
   - Props Interface extends `React.ButtonHTMLAttributes<HTMLButtonElement>`
   - Key custom props:
     * `asChild?: boolean` (Supports Radix Slot polymorphic rendering)
     * `loading?: boolean` (Disables button and shows automated spinner)
     * `leftIcon?: React.ReactNode` / `rightIcon?: React.ReactNode`

### Tailwind v4 Compilation Rules
1. **NO `tailwind.config.js`:** We use CSS-first configuration. All theme utilities are declared inside `packages/ui/src/theme.css` under the `@theme` directive.
2. **Dynamic Utility Classes:** To add custom colors dynamically at runtime, leverage theme tokens variables (`bg-primary-600`, `text-neutral-950`) rather than arbitrary values like `bg-[var(--...)]`.