# Typography Studio goal

## Goal

Build a visual typography generator for Blueprint. It should help users create,
preview, test, save, and export a consistent type scale in the same way that the
palette workspace manages colour.

The generator should produce controlled design-system tokens rather than a
collection of unrelated font sizes.

## System model

Typography uses two token layers:

1. Primitive scale tokens contain the generated font sizes.
2. Semantic role tokens connect those sizes to purposes such as display,
   heading, title, body, label, and caption.

This separation allows the scale to change without changing the names used by
applications and components.

## First version

The first useful version should support:

- Font-family selection.
- Base font size.
- Modular scale ratio.
- Number of scale steps.
- A live preview of the generated scale.
- Semantic role mapping for display, heading, title, body, label, and caption.
- Font-weight, line-height, and letter-spacing settings.
- English and Thai preview content.
- CSS token export.
- Local browser persistence.

Keep the calculation engine separate from the interface. Reusable scale,
validation, preset, and export logic belongs in `packages/ui/src/typography`.
The workspace interface belongs in `apps/playground/components/typography`.

## Later improvements

After the first version is stable, consider:

- JSON design-token export.
- Project-file import and export.
- Additional product, editorial, and marketing presets.
- Font loading and performance guidance.
- More detailed readability and accessibility checks.

**Shipped after the first version.** Named preview devices (phone, tablet,
desktop, extra desktops) each hold a width, a ratio, and optional typed size
and line-height. Export interpolates consecutive frames with `clamp()`, so a
layout between two named widths is not stuck on the narrower size. Role
`--font-size-N` tokens stay on the canonical desktop ramp (`TypeSystem.ratio`).
Queries and fluid spans use `device.widthPx`. `TypeSystem.breakpointPx` is
dropped on read; old files that still name it load. Letter-spacing ships as
`em` relative to the role's desktop size, so tracking follows the interpolated
font-size rather than sitting still in px. A typed value on one preview frame
unlinks that frame the same way line-height does; missing keys follow the
shared `letterSpacingPx`. Each group's auto line-height ratio is stored on
the group (Display 1.1, Headings 1.2, Body 1.5, Label 1.3, Caption 1.4) and
edited beside the name; roles still on auto follow it.

## Safety and quality rules

The studio should warn users about body text that is too small, line height that
is too tight, excessive scale growth, too many type sizes, and missing font
weights. English and Thai text must both be reviewed because Thai marks need
enough vertical space.

Generated examples must use semantic HTML such as `h1`, `h2`, `p`, and `label`.
Typography tokens control presentation, while HTML elements keep their meaning
and accessibility.

## Definition of done

The first version is complete when a user can:

1. Create a scale from a base size and ratio.
2. Assign generated sizes to semantic roles.
3. Review realistic English and Thai examples.
4. See useful validation warnings.
5. Refresh the page without losing the project.
6. Export valid Blueprint and Tailwind v4 CSS tokens.

The calculation and export functions must have unit tests. The main creation,
persistence, editing, and export flows must have Playwright coverage.
