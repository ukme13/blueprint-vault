# 2026-09-22 — 20px rail icons, 52px collapsed rail, and smooth chrome transitions

Following PR #135's seamless rail animation pass, this iteration refines the
visual density and state transition fluidity of the sidebar navigation. We
standardized all rail icons from 24px (`1.5rem` / Astryx `size="lg"`) to 20px
(`1.25rem` / Astryx `size="md"`), balanced the collapsed rail width to 52px
to align with Astryx's 8px grid tokens, and eliminated abrupt icon popping
with synchronized CSS fade-in animations.

## Key changes

1. **Uniform 20px icon marks (`1.25rem` / Astryx `size="md"`)**:
   - Resized `.astryx-side-nav-item .astryx-icon` in `apps/playground/app/globals.css`
     from `1.5rem` (24px) to `1.25rem` (20px).
   - Standardized the Blueprint monogram in `RailBrand.tsx` and `rail-brand.module.css`
     to `size="md"` (20px / `1.25rem`), locking the brand letters' aspect ratio
     to `350 / 174` at `height: 1.25rem`.
   - Updated the project name edit pencil in `WorkspaceNameField.tsx` and
     `shell-name.module.css` to `size="md"` (20px).
   - Updated the theme toggle icon in `ThemeControl.tsx` and `theme-control.module.css`
     to `size="md"` (20px).

2. **52px collapsed rail width (`calc(var(--spacing-12, 48px) + var(--spacing-1, 4px))`)**:
   - Astryx `SideNav` uses an 8px inline padding token (`var(--spacing-2, 8px)`).
   - With 36px action buttons, total rail width requires $8\text{px} + 36\text{px} + 8\text{px} = 52\text{px}$.
   - Updated `--rail-collapsed-width` in `workspace-shell.module.css` from 48px to 52px.
   - Every collapsed action button starts cleanly at `x: 8px` and ends at `x: 44px`,
     leaving exactly 8px right padding ($52 - 44 = 8\text{px}$).
   - Every 20px SVG icon centers at `x: 16px`, leaving exactly 16px padding on both
     sides ($16 + 20 + 16 = 52\text{px}$).
   - Removed all negative margin offsets (`margin-inline-start: 0`), achieving
     natural mathematical symmetry.

3. **Theme control vertical balance**:
   - Added `margin-top: var(--spacing-1, 4px) !important;` to `.themeTrigger`.
   - In expanded mode, the segmented control receives top padding below the divider.
     This 4px top margin preserves identical vertical breathing room in collapsed mode.

4. **Smooth chrome transitions (eliminating abrupt pop-in)**:
   - Previously, collapsed action buttons (`collapsedEditButton` and `themeTrigger`)
     popped in at 100% opacity the instant `isNavCollapsed` flipped to `true`.
   - Added `@keyframes fadeIn` (180ms cubic-bezier) on both collapsed buttons so
     they fade gracefully into view when mounted.
   - Added matching 200ms `@keyframes fadeIn` animations on `.fieldContainer` and
     `.expanded` so text fields and segmented controls fade smoothly into view
     when expanding.
   - Adjusted the collapse unmount timer in `WorkspaceShell.tsx` to 190ms,
     seamlessly handing off from the 180ms fade-out of expanded items into the
     fade-in of collapsed triggers while the 240ms width animation completes.
   - Added full `prefers-reduced-motion: reduce` guards disabling animations.

## Architectural decisions & trade-offs

- **Honoring Astryx grid tokens vs arbitrary pixel widths**:
  Attempting a 56px rail required asymmetrical 10px margins, and 48px forced
  awkward 6px side paddings on 36px buttons. 52px matches `var(--spacing-12, 48px) + var(--spacing-1, 4px)`
  and perfectly accommodates Astryx's built-in 8px (`var(--spacing-2)`) padding.
- **CSS animation fill mode vs transition cascade**:
  Using `animation-fill-mode: forwards` on `.fieldContainer` previously broke the
  fade-out transition because the `to { opacity: 1 }` keyframe retained higher
  cascade specificity than the `data-collapsing="true"` author rule. Removing fill
  mode allows the animation to release control once finished, letting `transition: opacity 180ms`
  fade out cleanly during collapse.

## Lessons learned

1. **Inspect computed bounding boxes across all states**:
   Visual misalignment often stems from subtle container defaults. Inspecting exact
   bounding box coordinates (`x`, `width`, `padding`) in Playwright revealed that
   flex alignment differences between `stickyTop` and `scrollable` were shifting
   buttons by 2px.
2. **Phase coordination requires entry animations for newly mounted nodes**:
   CSS transitions cannot animate an element's initial mount. Pairing a phase-delayed
   state toggle (`isNavCollapsed`) with `@keyframes fadeIn` provides a continuous,
   fluid visual bloom without blank gaps or pop-in artifacts.
