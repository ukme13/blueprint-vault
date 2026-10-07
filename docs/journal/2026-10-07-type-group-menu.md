# 2026-10-07 — Shared desktop tracking, and a menu for type groups

One commit on `feat/type-group-menu`.

## Key changes

- **Letter spacing typed on Desktop is the shared value.** It sets the
  role's `letterSpacingPx` and clears any Desktop override, so Tablet and
  Phone follow it. Typed on Tablet or Phone it is still that frame's own;
  clearing it goes back to the shared value. (`setLetterSpacingOnDevice`)
- **A group's trash button is a "…" menu** with Duplicate group and Delete
  group (`RoleGroupMenu`).
- **Duplicate group** (`duplicateGroup`) puts "Body (Copy)" directly under
  Body. Its roles take the copy's names from `roleIdsForGroup`
  (`body-copy-sm`); a role following another in the same group follows that
  role's copy.
- **Delete group asks first** when the group has roles, and always on a
  phone. An empty group on a wide screen goes without asking.
- **Motion:** a new or duplicated group fades and slides in (280ms) and is
  scrolled to; a deleted one folds away (200ms) before it is removed. Both
  are off under reduced motion.

## Architectural decisions

- **Desktop is the reference frame.** A value typed there is the shared one
  rather than an override, which is what made Tablet and Phone sit at 0
  before. Extra desktop frames ("Desktop 2") still keep their own.
- **The delete runs after the fold, not under it.** The card measures its
  height when the fold starts and animates from it; the removal is a timer,
  not cleared on unmount, so switching tabs mid-fold still deletes.
- **A new group is found during render**, like a new role: the one id that
  is new when the list grew by exactly one. A preset that swaps the groups
  marks nothing.

## Lessons learned

- **A duplicated heading group is not a heading group.** `h` copies to
  `h-copy`, whose roles are `h-copy-1` and on, not `h1`. That follows the
  naming rule; it is worth knowing before someone expects six more headings.
- **Desktop's AlertDialog is an `alertdialog`, the phone's sheet a
  `dialog`.** A spec that names the role has to know which screen it is on.

## Checks

- `pnpm lint`; `packages/ui` 1556 and `apps/docs` 65 unit tests, with each
  new rule broken once.
- Playwright against a production build: typography editing, letter
  spacing, styles and the phone group test, 88 of 88.
- With the other three branches of the day merged in: 200 of 200.

## Left to do

- `RoleGroupEditor.tsx` is about 358 lines, over the 250 target, as it was
  before this change.
