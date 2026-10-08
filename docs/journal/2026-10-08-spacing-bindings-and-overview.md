# 2026-10-08 — Spacing tags bind, Section inset, and a livelier Overview

Sixteen commits on `feat/role-button-hierarchy`. They started as small
polish on the typography studio and grew into three pieces of work: a
Figma-style picker on the Preview's spacing overlay, a use of its own for
section padding, and a better board on the Overview.

## Key changes

- **Typography groups.** Remove-role is a borderless glyph that turns error
  red on hover; Add-role is a contained primary button, grey when the group is
  full. H and Body are core groups: no Delete group in their menu, the last
  role's remove button is disabled, and a faint lock sits at the end of the
  name (`isCoreGroup`, `canRemoveRole`, guarded `removeGroup` and
  `removeRole` in `packages/ui`).
- **Elevation preview** opens on Button, the first of its three tabs.
- **Spacing picker on the Preview overlay** has two chips, Uses and Steps.
  Uses lists the layout's spacing uses with their sizes and is searchable by
  name or px; Steps is the primitive list. The shared `SelectorOptionList`
  gained an opt-in `hasDescriptions` that shows and searches an option's
  description.
- **Slot binding.** A tag sits on a slot (`inset-card`) and shows the use the
  slot is bound to. Picking a use binds the slot to it and leaves the use it
  started on alone; picking a step sets the bound use. Held on the preview,
  not saved (`layout-bindings.ts`, `SystemPreview` state).
- **Section inset** (`inset-section`, desktop step 16) is a system layout use
  in its own right. Section bands and the footer read `--inset-section`
  instead of `calc(var(--gap-section) * 1.25)`, which painted 80px beside a
  Section gap of 64px — a size no use named.
- **`fg.muted`** is a seeded semantic role between secondary and disabled
  (neutral 550 light, 500 dark). The docs export is regenerated; the seeded
  count is seventy-three.
- **Overview.** Radius and Spacing diagram specimens were built and then
  replaced by a field with its button (Input and Button radius) and a row of
  chips on Chip radius, in four semantic variants. The board scopes the
  project's semantic variables, so it resolves colour from the project and not
  the studio. Cards are lifted off the canvas by fill, in light and dark.

## Architectural decisions

- **Binding is a map from slot to use, not an edit of the table.** Sparse: no
  entry means the slot reads its own use. The page reads the bound use's own
  size, not what that use is itself bound to, so two slots bound to each other
  cannot loop.
- **The request to "prefer `token.id`" would have kept the check stuck.** After
  taking another use's step, the token holds that step too, so preferring it
  puts the check back on the token's own row. The layout stores the step, not
  where it came from. A first fix remembered the pick in component state; the
  real fix was binding, which makes the shown token genuinely the bound one.
- **Domain logic stayed in `packages/ui`.** `spacingUses`, the binding
  functions and the core-group rule are pure and unit tested; the components
  only render.
- **Surface tones pair by mode on the Overview.** The seeded surface roles run
  the other way round in dark (overlay darkest, subtle lightest), and
  `surface.raised` is tinted by the primary, so no single role works as the
  card in both modes. Canvas, card and well are three tones chosen by a
  `data-mode` attribute.
- **Component radius uses are set on the Overview cards.** Nothing above the
  board set `--radius-input`, `--radius-button` or `--radius-chip`; only the
  Preview did.

## Lessons learned

- **A shared component may not do what its props suggest.**
  `SelectorOptionList` took a `description` and never drew it, so the old
  Steps list had never shown its px. Read the renderer before assuming.
- **A test that passes for two reasons proves neither.** The "radius uses are
  left out" test also had no value on that frame. Breaking the code once
  showed it; the test now isolates the filter.
- **Undoing a deliberate break with `git checkout <file>` reverts everything
  uncommitted in it.** One slip wiped a file; a backup copy restored it. Use
  `cp` to a scratch file around a break check.
- **`\b` inside a template literal is a backspace.** It reached a Playwright
  regex through a shell-quoted script; `no-control-regex` caught it. Write
  `\\b`, or use the editor and not a shell.
- **A phone sheet's sticky search covers whatever precedes the list.** The
  chips were untappable until they moved into the list's `header` slot.
- **The primitive-usage rule applies to the studio chrome too.** A first
  Overview surface used palette shades; `primitive-usage.test.ts` objected,
  and the tones were rebuilt from semantic roles.
- **Hardcoded counts are a tax on every seeded addition.** Adding one role or
  one use touched about twenty tests that listed ids or counted them. The
  lists are worth keeping, but expect the churn.

## Not done

- Bindings are not persisted, so a reload clears them.
- Core groups can still be renamed, which re-slugs the id and ends the
  protection.
