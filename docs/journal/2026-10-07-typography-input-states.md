# 2026-10-07 — One look for auto, shared and override values

Three commits on `feat/typography-input-states`.

## Key changes

- **Line height typed on Desktop is the shared value**
  (`setLineHeightOnDevice`), as letter spacing is in `feat/type-group-menu`:
  Tablet and Phone follow it until given their own.
- **The three role fields read the same way:**

  | State                              | Value                                                 | ✕                             |
  | ---------------------------------- | ----------------------------------------------------- | ----------------------------- |
  | Auto                               | size chip with hexagon; muted line-height placeholder | none                          |
  | Typed shared (Desktop line height) | default colour                                        | default colour, back to auto  |
  | Following on Tablet or Phone       | default colour                                        | none                          |
  | Override on this frame             | accent colour                                         | accent colour, back to shared |

- **Size gains the override state:** a typed size is in the accent colour
  with a ✕ back to the role's step (`HybridTokenizedInput` `isOverride` and
  `onRelink`). A role with no step gets no ✕.

## Architectural decisions

- **Accent always means "this frame's override".** The ✕ takes the colour
  of the value it clears, on all three fields.
- **The ✕ colour is set on the icon, not the button.** Astryx gives its
  buttons a colour no module selector outranks; the icon inherits it unless
  told otherwise.
- **A typed shared line height keeps a ✕.** Without it the only way back to
  auto was the A key: emptying the field does not commit, because
  NumberInput puts the last value back on blur.

## Lessons learned

- **A ✕ named "Clear body size" also matches `getByLabel("body size")`.**
  Playwright matches labels by substring, so the specs name the textbox by
  role.
- **Three things in one field need measuring.** A typed three-digit size
  next to two buttons is the widest case; a spec now types 120 and checks
  the number is not cropped.

## Checks

- `pnpm lint`; `packages/ui` 1551 and `apps/docs` 65 unit tests, with the
  desktop rule broken once.
- Playwright against a production build: the typography specs and phone
  typography tests, 98 of 98, plus the size-fit spec. The colour checks
  fail without the icon rule.
- With the other three branches of the day merged in: 200 of 200.

## Left to do

- A typed shared letter spacing on Desktop has no ✕: there is no auto to go
  back to. A ✕ that resets it to 0 is a possible follow-up.
