# 2026-10-09 — The radius preview card is Blueprint AI

Three commits on `feat/verba-preview-card`. The card in the Radius studio's
Preview tab, which shows every radius use on one piece of UI, was an AI chat
panel on an orange gradient. It is now cleaner, takes the project's primary,
and is called Blueprint AI.

## Key changes

- **The panel's surface follows the project.** The gradient mixed the warning and
  error colours, which had nothing to do with the brand. It is now the subtle
  surface with a breath of the primary at the top, fading out, mixed from
  semantic tokens so it follows the primary and the theme.
- **The type is quieter.** The `mt-16` gap above the greeting is gone, the title
  is smaller and tighter, and the greeting is ordinary text in the display face.
- **The chips are crisp.** A hairline border on the base surface, with the
  border, fill and text all stepping up on hover.
- **The composer is one bar.** The field, the mic and Ask sit inside a single
  outline on Input radius, with the mic and Ask set inside it on Button radius,
  so the field's corner and its buttons' corners are read together. The outline
  is the subtle border until the bar has focus, then the accent.
- **Renamed Blueprint AI**, in the title and the card's accessible name.
- **No sparkle.** A decorative icon above the greeting read as AI boilerplate and
  was taken out again.

## Architectural decisions

- **`radius-input` moved to the bar.** The sample hook for Input radius is on the
  composer container, not the bare input, since the bar is what draws the
  corner. The test that checks the radii finds the first of each hook, and still
  does.
- **Semantic tokens, no hex.** The panel and every outline are built from
  `surface-*`, `border-*` and `action-primary`, so the card stays a tint of the
  project and turns warm or cool with it.

## Lessons learned

- **An outline's weight is a decision.** The composer first took `border-default`
  while everything around it used `border-subtle`, and read as the heaviest thing
  on the card.
- **A hover rule can fight a focus rule.** A hover border on the composer could
  beat the focus border when a focused field was hovered, since Tailwind may
  order hover after focus-within. It was dropped.

## Not done

- A first full run of `spacing-studio` failed one focus check and the second
  passed all 54. It was not tracked down, and nothing in this change touches focus.
