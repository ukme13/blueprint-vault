# 2026-10-07 — A Desktop size is shared, and compact size buttons

One commit on `fix/size-input-states`.

## Key changes

- **Size follows the rule line height and letter spacing already do.**
  Typed on Desktop it is the shared size: the role leaves the ramp
  (`stepOffset` null) and Tablet and Phone follow it, in the default colour
  with no ✕. Typed on Tablet or Phone it is that frame's override, in the
  accent colour (`setSizeOnDevice`).
- **The ✕ on a Tablet or Phone size drops that frame's own size**
  (`relinkSizeOnDevice`), so it follows the step or the Desktop size again.
  It used to rebind to the step, which a Desktop edit no longer leaves.
- **Compact buttons in `HybridTokenizedInput`.** The ✕ and the step
  (hexagon) button are 20px, muted until hovered, grouped with a 4px gap,
  instead of two 28px `IconButton`s in a 32px field. Astryx tooltips stay.
  Spacing, Radius, layout uses and preview device settings use the same
  input and get the compact step button too.

## Architectural decisions

- **Plain buttons, not `IconButton`.** Astryx's smallest is `sm`, 28px. The
  buttons are wrapped in Astryx `Tooltip`, which its guidance asks of an
  icon-only control.
- **A project from before keeps a way back.** A typed Desktop size that
  still has a step shows a ✕ back to that step, in the default colour.

## Behaviour change

- After a Desktop size edit, Phone shows the same size, not a smaller step.
  Type a Phone value, or pick a step, to scale it.

## Checks

- `pnpm lint`; `packages/ui` 1563 and `apps/docs` 65 unit tests, with the
  desktop rule broken once.
- Playwright against a production build: typography, spacing studio,
  styles and mobile, 270 of 271. The one failure is spacing-studio's
  "picks a base unit from Figma-style presets", the known flake (PR #179),
  on the chip path this change does not touch. Not retried.
- New specs: a Desktop size is shared; a Tablet override is accent and its
  ✕ returns to the step; a typed 120 fits with both buttons at most 20px.
  Each fails when its rule is broken.
