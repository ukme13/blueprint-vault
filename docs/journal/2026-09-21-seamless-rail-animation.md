# 2026-09-21 — Seamless rail expand/collapse animation

The playground left rail snapped abruptly between expanded (280px) and collapsed
(64px) states. The Google Gemini sidebar (`gemini.google.com`) achieves a calm,
fluid collapse by animating rail width and opacity while holding anchor points
steady. This pass implements that motion model across the Astryx `SideNav`,
stabilizes all header row geometry to eliminate jitter, and polishes brand mark
fidelity across Home and the studios.

## Motion model and phase coordination

Astryx `SideNav` does not animate its width or cross-fade children natively.
Applying a simple CSS width transition is not enough: unmounting expanded
children (`WorkspaceNameField`, wordmark letters, segmented theme control) on
the same tick causes content to vanish while the rail is still wide, snapping the
remaining icons inwards.

The solution is coordinated phase-delayed unmounting:

- `collapsed`: The immediate logical state driving CSS classes, persisted to
  `localStorage` under `blueprint.shell.rail-collapsed`.
- `isNavCollapsed`: The visual unmount trigger passed to Astryx `collapsible.isCollapsed`.
  When collapsing, `isNavCollapsed` delays unmounting by 240ms via a timeout,
  matching the `240ms cubic-bezier(0.2, 0, 0, 1)` width transition. Expanded
  chrome fades to opacity 0 while the rail compresses. When expanding,
  `isNavCollapsed` flips immediately to `false`, mounting the expanded chrome so
  it fades in alongside the growing width.
- `prefers-reduced-motion`: Bypasses the 240ms timer entirely, toggling
  immediately without transition.

## Continuous monogram anchor

The Blueprint monogram ("B") now serves as a permanent visual anchor:

- In expanded state, the brand heading shows the full wordmark. The monogram "B"
  is positioned identically at the left edge (`x: 14px`), while the trailing
  letters ("lueprint") sit in a separate container that fades out and slides
  (`transform: translateX(-4px)`) behind an `inset` clip path.
- In collapsed state, the monogram remains in the exact same pixel position,
  swapping gracefully to `PanelLeftOpen` on hover or keyboard focus to signal
  expansion.
- Clicking the collapsed mark expands the rail; it never accidentally triggers
  navigation to Home. When expanded, clicking the brand wordmark navigates Home,
  and the dedicated `PanelLeftClose` button collapses the rail.

## Geometry stabilization (zero jitter)

Any horizontal or vertical deviation between states reads as wobble or jitter:

1. **Uniform 36px row heights**: `RailBrand`, `WorkspaceNameField`, `ThemeControl`,
   and `SideNavItem` are all standardized to 36px row heights. Previously,
   differing heights (32px, 28px, 40px) caused vertical content jumping on
   state swaps.
2. **Standardized 36px action squares**: Action triggers (`collapsedTrigger`,
   `collapsedEditButton`, `themeTrigger`, navigation glyphs) are 36x36px with
   `margin-inline-start: 0`. Their 24px icon centers sit exactly 32px from the
   left viewport edge (14px rail padding + 18px half-width).
3. **Fixed 244px inner containers**: Expanded containers are pinned to
   `width: 244px; min-width: 244px; overflow: hidden;`. This prevents text wrapping
   or layout recalculation while the parent rail compresses from 280px to 64px.
4. **Consistent flex alignment**: Removed the collapsed rule that changed
   `align-items` to `center`. The rail stack maintains `align-items: flex-start`
   universally.
5. **Full-bleed divider**: The divider extends edge-to-edge across the rail
   (`margin-inline: -14px; width: calc(100% + 28px);`) in both states.

## Brand and logo fidelity

- **Home wordmark uncropped**: Fixed SVG aspect ratios and viewport bounds.
  `BlueprintWordmark` uses `viewBox="0 0 623 174"`, explicit `width="623"`,
  `height="174"`, and CSS `aspect-ratio: 623 / 174` to prevent WebKit/Safari
  auto-scaling width truncation bugs.
- **Project name field**: Text field height locked to 36px, perfectly matching
  the 36px collapsed edit icon.
- **Theme control**: Segmented control when expanded, single button with mode-aware
  icon (`Sun`, `Moon`, `Monitor`) when collapsed, styled with secondary muted
  tones matching surrounding action icons.
- **Favicons**: Added light/dark adaptive SVG favicons and app icons to docs
  and playground metadata.
- **Semantics table height**: Adjusted `.workspace[data-section="semantics"]` to
  `height: auto` so long tables do not run out of container background.

## Checks

- `pnpm lint`: Passed cleanly across all packages with `--max-warnings 0`.
- `pnpm --filter playground check-types`: Clean TypeScript build (0 errors).
- `pnpm -r test`: 67 test files, 1,121 tests passed (0 failures).
- Playwright (`apps/playground/e2e/workspace-shell.spec.ts`):
  - Brand heading wordmark and collapsed mark render correctly.
  - Hover/focus swaps B to `PanelLeftOpen`.
  - Project name text field matches the 36px height of the collapsed edit button.
  - Full uncropped wordmark renders on Home TopNav (`viewBox="0 0 623 174"`).
  - All 13 shell spec tests passed with `--reporter=line`.

## Lessons

**Width transitions in CSS flex layouts require fixed-width inner wrappers.** If
inner text fields or labels are allowed to flex naturally during a width
transition, text wraps mid-animation before vanishing, producing visual stutter.
Constraining inner content to `min-width: 244px` and `overflow: hidden` ensures
the element is cleanly clipped by the outer boundary.

**WebKit truncates inline SVGs with fixed height unless aspect-ratio is explicit.**
When sizing an SVG with `height: 2rem; width: auto;`, Safari may compute a 0 or
fallback width if `aspect-ratio` is missing from the CSS rules. Explicitly
setting `aspect-ratio: 623 / 174` resolves this across all engines.

**Icon alignment is pure geometry.** If icon wrappers have disparate margins or
the stack shifts from `flex-start` to `center`, icons will wobble horizontally.
Giving every trigger a 36x36 box with 0 margin and pinning the container
padding ensures mathematical alignment across states.
