# Colour formats and anchors plan

## Goal

Make colour editing consistent across the playground and support real brand
palettes that use more than one exact reference colour inside a single track.

Users should be able to choose how colour values are displayed, create smooth
transitions between important colours, or change one shade without changing its
neighbours.

## Product rules

- Keep the interface minimal until a user starts editing.
- Use one shared HEX, OKLCH, or RGB display preference across colour tools.
- Keep the source colour as the main anchor for a track.
- Treat additional smooth reference colours as custom anchors.
- Keep exact one-shade changes as manual overrides.
- Never silently remove or replace a user change.
- Recalculate previews and accessibility results after every colour change.

## Stage 1: Shared colour formats

Status: Complete.

Add HEX, OKLCH, and RGB formatting and conversion utilities to
`packages/ui/src/color`.

The selected format should apply to every ColourPicker and ShadeDetailPopover.
Changing it in one place should update the others. Store this as a browser user
preference, separate from palette project data.

## Stage 2: ColourPicker modes

Status: Complete.

Provide controls that match the selected format:

- HEX: colour field, hue slider, and HEX input.
- OKLCH: Lightness, Chroma, and Hue sliders with number inputs.
- RGB: Red, Green, and Blue controls.

Grey out slider areas that are outside the displayable sRGB range. Convert an
out-of-range selection safely without breaking the picker.

## Stage 3: Shade details

Status: Complete.

Add the shared format selector beside the displayed shade value. Clicking the
value should copy the currently displayed format and show short copied or error
feedback.

WCAG calculations continue to use the actual shade colour and should not change
when only the display format changes.

## Stage 4: Colour anchors and smoothing

Status: Complete.

Core multi-anchor smoothing, persistence, indicators, per-anchor reset,
track-level reset, and non-blocking transition warnings are complete.

Allow multiple exact anchor colours inside one track. The source colour remains
the main anchor, and users can add custom anchors at other shade weights.

Generate shades between neighbouring anchors in OKLCH:

- Preserve the exact colour at each anchor.
- Keep lightness in a valid light-to-dark order.
- Blend chroma smoothly.
- Follow the shortest path around the hue circle.
- Use the first and last generated shades as virtual boundaries, then blend the
  full row through every custom anchor and the source colour.

For example, a client colour at 200 and a source colour at 600 remain one
primary track. Shades between them should transition smoothly instead of
creating a second semantic colour track.

## Stage 5: Manual shade changes

Status: Complete.

Editing a generated shade creates a manual override immediately. Then offer:

- **Manual / Anchor switch**: keep the current colour while changing whether it
  affects only this shade or smoothly changes the full row.
- **Reset**: remove the manual override or custom anchor and return to the
  generated colour.

Apply palette changes in this order:

1. Generate the normal track.
2. Blend between source and custom anchors.
3. Apply manual shade overrides last.

This order ensures that manual colours are never silently replaced.

## Editing indicators and reset actions

Use small, clear indicators for Source, Anchor, and Manual shades. Provide these
actions where relevant:

- Reset this anchor.
- Reset this manual shade.
- Reset all custom shade changes in the track.

Show a live preview of affected shades before a user confirms an anchor change.

## Project data

Palette projects should store anchors and manual overrides. The display format
preference should remain user-level browser data.

```ts
interface TrackAdjustments {
  anchors: Record<number, string>;
  manualOverrides: Record<number, string>;
}
```

Import and export support must preserve these values when project files are
added later.

## Validation

Warn users about:

- Broken light-to-dark order.
- Large hue changes that may not form one natural colour family.
- Uneven transitions created by manual edits.
- Colours outside the displayable range.
- Accessibility results that become worse after editing.

Warnings should explain the problem without blocking intentional advanced use.

## Definition of done

This milestone is complete when a user can:

1. Select HEX, OKLCH, or RGB once and see it across all colour tools.
2. Refresh without losing the selected display format.
3. Copy the displayed format from shade details.
4. Add two or more anchors to one track and receive a smooth transition.
5. Change one shade without smoothing when exact control is required.
6. Identify and reset source, anchor, and manual shades.
7. Refresh without losing anchors or manual changes.
8. See updated WCAG results for the final effective colours.

Conversion, interpolation, persistence, and reset logic need unit tests. The
main editing, copying, keyboard, responsive, and persistence flows need
Playwright coverage.
