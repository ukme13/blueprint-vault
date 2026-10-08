# 2026-10-09 — An undo goes to where the edit was made

Six commits on `feat/undo-navigation`. One undo history already spanned every
studio; this makes it show its work. An undo or a redo now takes the person to
the edit it reverted, says what it did, points at the cell, and works on a Thai
keyboard.

## Key changes

- **The shortcut finds Z and Y by position** (`undoShortcut`, shared by the
  window hook and the semantic table's own keys). Under a Thai layout the Z key
  types ผ, so `event.key` is no help; `event.code` is `KeyZ`. Ctrl/Cmd+Y now
  redoes too. A chord with Alt is left to the text, since some layouts type
  AltGr as Ctrl+Alt.
- **Each history step records its origin**: the studio the edit belongs to, read
  from which undoable part changed (`originOfChange`), or given by the edit
  (the Preview's spacing tags say `/preview`). Semantics is
  `/colour?view=semantics`; layout uses are Spacing's, or Radius's when only
  radius uses moved; device ratios belong to no studio and move nobody.
- **The shell goes there** (`useUndoNavigation`). One effect, keyed on the
  store's `revision`, covers the shortcut, the toolbar buttons and the semantic
  table's keys. It stays put when the person is already there, opens the studio
  on its last view otherwise, and uses the view an origin names when it names one.
- **A tab of the open studio follows too.** `pushStudioUrl` pushes the address
  and notifies, as a tab click does, so undoing a Semantics edit from the shade
  generator switches tabs.
- **A line says what happened**: "Undid edit in Semantics", with Redo (after an
  undo) or Undo (after a redo) to take it back. Five seconds, one toast id, so
  they do not stack.
- **The restored cell flashes.** Each step carries what it changed in the
  semantic layer, down to the cell (`changedSemanticTargets`). The editor finds
  those cells once drawn, scrolls the first into view and sets
  `data-undo-highlight` for three seconds: a held tint that fades, or a ring
  under reduced motion. Any studio can opt in with `useUndoHighlight`.

## Architectural decisions

- **Origin is inferred, with an override.** Reading it from the diff needs no
  plumbing through every edit; the explicit `origin` on `update` is for the one
  place where what changed would name the wrong studio.
- **Navigation hangs on `revision`, not on the shortcut.** Anything that
  undoes changes `revision`, so one place does it for all of them.
- **The decision is pure and the hook only acts.** `undoMove` says where to go
  and whether it is another view of the open page; `stepMessage` and `originLabel`
  say what to call it. All in `packages/ui`, tested without a browser.
- **The history module is three files**: `undoable-parts` (what an undo owns
  and how it compares), `workspace-origin` (where an edit was made, what it
  changed) and `workspace-history` (the stack).
- **The flash is a hook plus a stylesheet rule.** The hook finds and times; the
  look is global. A step older than five seconds does not flash, so a studio
  opened later stays calm.

## Lessons learned

- **`router.push` to the same path with another query leaves a URL-driven tab
  where it was.** The view state reads the address and is told only by its own
  setter, `popstate` or its own `notify`. A change made in code has to notify.
- **Making an undo visible exposed a step that had always been invisible.**
  Leaving the Semantics tab rewrote the layer with `alpha: 1` where there was
  none, and the history counted it as an edit. The first undo afterwards did
  nothing you could see; once it took you to the Semantics tab to show nothing,
  it mattered. Opaque is now opaque however it is written.
- **A toast button shares names with the page's own.** The scale studio has
  Undo and Redo buttons in its toolbar; the toast's made `getByRole` ambiguous.
  The specs scope to the toolbar's region.
- **The e2e runs reduce motion**, so the flash is a ring there. The fade is
  asserted by emulating no preference for the redo.
- **`useUndoShortcut` ignores text fields and dialogs, so the Thai test fires
  on the body.** It dispatches the keydown as the browser reports it, with
  `key: "ผ"` and `code: "KeyZ"`.
- **Renaming a file under a running dev server breaks it.** The `.ts` to `.tsx`
  rename for the toast button left a stale entry in the dev cache; a restart
  clears it.
- **Heredoc-written scripts eat backslashes.** Three regexes lost theirs on the
  way to disk; lint's `no-control-regex` caught one, TypeScript the others.

## Not done

- Only the Semantics editor flashes. Typography, Spacing and the rest can opt in.
- A token outside the group the table is filtered to has nothing on screen to
  flash, and the table does not switch groups for it.
