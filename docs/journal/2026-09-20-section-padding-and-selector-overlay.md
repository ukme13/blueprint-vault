# 2026-09-20 — Section padding, color swatches, and Astryx selector overlay clamping

Following the initial `/preview` landing site integration, three refinements were made
to the site presentation and inspector controls:

1. Generous, consistent section spacing across all bands.
2. Visual color swatches for text and section background color selectors in the inspector modals.
3. Resolution of Astryx's `<Selector>` popup detachment bug when selecting items deep in long lists.

---

## 1. Section padding

### Motivation

Previously, section padding was split into half-gap increments (`calc(var(--gap-section) / 2)` = 32px), with special rules on the first and last child. This resulted in cramped layouts where content felt crowded against band boundaries, and the footer was visually disconnected.

### Changes

- In `landing.module.css`, replaced child-specific rules on `.main > *` and `.footer` with a uniform:
  ```css
  padding-block: calc(var(--gap-section) * 1.25);
  ```
- This gives each section band 80px of top and bottom padding (160px total between content blocks), ensuring ample visual breathing room while background fills continue painting seamlessly from band to band.
- Updated Playwright metric assertions in `e2e/preview-page.spec.ts` to verify `betweenSections` matches `2.5 * metrics.gap`.

---

## 2. Inspector color swatches

### Motivation

In the inspector dialogs for slot typography and section fills, the color `<Selector>` displayed only token names (e.g., "Action primary surface", "Foreground primary"). Without a visual indicator, identifying the actual tint required guessing or memorizing token mappings.

### Changes

- Created `PreviewColourSwatch` (`apps/playground/components/PreviewColourSwatch.tsx`) and its stylesheet (`preview-colour-swatch.module.css`):
  - Renders a small token-aware color square (`--spacing-4` × `--spacing-4`, border with `var(--color-border)`, radius `var(--radius-sm)`).
  - Accepts a CSS variable string (via `semanticVariableName(opt.value)`) or a hex color.
  - Special `data-empty` diagonal stroke state for "Page default", indicating transparent/inherited color.
- Wired swatches into the `icon` slot of selector options and trigger comboboxes in:
  - `PreviewInspector.tsx` (text foreground colors).
  - `PreviewSectionInspector.tsx` (section background fills).
- Astryx's `<Selector>` automatically projects option icons into the combobox trigger button when selected.
- Added Playwright assertions confirming swatches are present and visible on both dropdown options and the active trigger.

---

## 3. Astryx selector overlay clamping

### Root cause analysis of the detached popover bug

Astryx's `<Selector>` attempts to emulate macOS dropdown behavior: when opened, it centers the currently selected item directly over the trigger button rather than simply dropping down.

In `useSelectedItemOffset`:

```javascript
desiredTop = anchorCenter - itemCenterInListbox - SELECTED_ITEM_OPTICAL_OFFSET;
clampedTop = Math.min(Math.max(desiredTop, 0), maxTop);
clampedOffset = Math.max(0, anchorRect.bottom - clampedTop);
// style: { marginBlockStart: `-${clampedOffset}px` }
```

In short lists, this works well. However, in long scrollable lists (such as `PREVIEW_TEXT_COLOR_GROUPS` with over 30 options spanning Foregrounds, Actions, and Statuses):

1. An option deep in the list (e.g., `action.primary.surface` or `status.*`) has `itemCenterInListbox > 1,600px`.
2. When the selector first opens, the DOM layout measures before the listbox has scrolled to the item (`scrollTop = 0`).
3. If `itemCenterInListbox` exceeds `anchorCenter` (typically ~500px on screen), `desiredTop` evaluates to a negative number (e.g., `-1,100px`).
4. Astryx clamps `clampedTop = Math.max(desiredTop, 0) = 0px`.
5. Astryx then computes `clampedOffset = anchorRect.bottom - 0px = 520px` and applies `margin-block-start: -520px`.
6. Since the popup is constrained by `max-height: 300px`, applying a `-520px` margin shifts the entire popup completely off the combobox and pins it to `top: 0px` (the ceiling of the viewport).

### The architectural fix

Rather than disabling Astryx's overlay behavior with `placement="below"` or breaking normal centering with blanket `!important` CSS resets, the solution enforces the physical invariant of an attached overlay:

> **The popover cannot be shifted upwards by more than its own listbox height.**

In `apps/playground/app/theme-provider.tsx`:

- Listens to document-level popover `toggle` events.
- When an Astryx selector popup opens, checks `marginBlockStart`.
- If `Math.abs(marginBlockStart) > listboxHeight`, clamps `marginBlockStart` to `-${listboxHeight}px`.
- Uses a `MutationObserver` on the popover element to maintain clamping if Astryx recalculates during asynchronous option rendering.

This ensures:

1. When options near the top are selected, native macOS-style centering works unimpeded.
2. When options deep in the list are selected, the bottom edge of the popup remains aligned with the trigger instead of detaching to the top of the screen.
3. No Astryx internal source code needs to be modified or ejected.
