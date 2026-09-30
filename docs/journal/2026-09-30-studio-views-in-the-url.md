# 2026-09-30 — Studio views live in the URL, and there is one undo history

Branch `feat/studio-tab-persistence`. It began as "Space to Preview and back
loses my tab" and grew into the studios keeping their place, one undo history
above them, and two smaller features that shared the branch.

## What changed

**A studio's place is in the address.**

- Typography, the scale studios and Colour keep their view and tab in
  `?view=` and `?tab=`. Back and Forward move between them, a refresh keeps
  them, and a value equal to its default is left out, so a studio opens on a
  clean path.
- The sidebar link and the Space shortcut return to the address a studio was
  left on. The memory is per browser tab (`sessionStorage`), so a new session
  opens every studio as it opens.
- Colour's Semantics tab also keeps its group in `?group=`, and the table's
  scroll position per group. `group` belongs to the Semantics tab, so it leaves
  the address with it.

**One undo history for the workspace.** It lives in the store, above the
studios, so an edit made in Typography is undone from Spacing. Typography got
undo and redo of its own first. The scale studios' shortcut now works wherever
focus is.

**Shade nicknames.** A shade can be named from its details, and an export says
the nickname beside the token in place of `main` or `submain`.

**Spacing.** Density is one slider, the scale preset is a card, and the Steps
panel starts folded.

**Control insets set a button's height.** Preview buttons take
`--inset-control-y` and `--inset-control-x` and no fixed height. Under Control
block inset the Uses table shows what that comes to, `Button: ~38px (md)`, live
as the inset is edited.

## Decisions

- **The query is read with `useSyncExternalStore`, not `useSearchParams`.**
  `useSearchParams` makes a prerendered page bail out to the client and wants a
  `<Suspense>` boundary; the boundary let the studio hydrate after the
  workspace had loaded, so its "Loading…" page and the server's disagreed. The
  hook's server snapshot is the empty query, so the studio opens on its
  defaults there and React re-reads the address once hydrated.
- **`history.pushState`, not `router.replace`.** Replacing adds no entry, and
  Back would skip every tab.
- **The undo history commits by value.** A step is recorded only when an
  "undoable part" changes by JSON value, and an undo patches those parts onto
  the current document rather than restoring a snapshot, so what an undo does
  not own (the workspace name) is left as it now is.
- **Scroll is noted as it moves and saved in a layout effect's cleanup.** By the
  time a list unmounts for another page, the container beneath has shrunk and
  been pulled back to the top; reading it then gives 0. A layout effect's
  cleanup runs in the commit that removes the list, before the browser reports
  that pull as a scroll.
- **The scroller is found, not named.** In Semantics the vertical scroll is the
  shell's content region, not the table, so the hook takes the nearest
  ancestor that scrolls.
- **The pure parts are in `packages/ui`.** `studio-view.ts`
  (`studioViewParam`, `withStudioParam`, `withoutStudioParams`,
  `rememberStudioView`, `studioHref`), the undo history, and
  `control-height.ts` are tested there; the app binds them to React state and
  the address.
- **A button's height is a sum, and the hint is that sum.** A line of the
  label, the inset twice and the border twice (`controlHeightPx`), read from
  the type system's button roles as the export reads them. The hint names the
  `md` button alone, as the gauge for the inset.

## Lessons

- **A test can pass for the wrong reason, and only breaking it shows.**
  "Opens on its default tab" passes with or without the URL wiring; five of the
  seven new Colour tests are the ones that fail without it. The height check on
  the preview started at ±2px, which let a missing border (2px) through, and
  only failed once tightened to ±1.
- **Old tests encoded the old behaviour.** "Resets to Shade generator after a
  reload" was a feature-as-assertion, and the Button tones test waited for the
  palette toolbar, which is hidden on Semantics, so it could never pass once a
  reload stayed on the tab. Both are updated, not skipped.
- **A second quick undo overwrote the first.** The open studio re-reads its
  slice after each undo, and writing that copy back clobbered a second undo
  that had already landed. A ref marks a just-read copy so it is not persisted
  again; the test fails 4 of 4 without it.
- **A rename mirrored into the type system made a phantom undo step.** The name
  is not an undoable part, and an undo keeps the current one.
- **The hint's first fallback role was the wrong one.** With no button group the
  preview seeds buttons in the _label_ slot's role, not body. The e2e that
  compares the hint to the drawn button caught an 8px gap; the unit tests, which
  only compared the function to itself, did not.
- **A fixture is a decision.** The Typography fixture seeds no palette, so Colour
  tests written against it found no Semantics tab. Use the fixture that seeds
  what the test needs.
- **Astryx `Collapsible` is open by default.** Removing `defaultIsOpen` folded
  nothing; it needs `defaultIsOpen={false}`. And `Slider` snaps to its step by
  itself, so a snapping function of ours was redundant.
- **Nicknames are user text in a comment.** They are cleaned in a loop until
  stable, because removing one comment delimiter can reassemble another
  (`**//`).
- **A second fill on a typed value appended under load.** `fillHybridNumber`
  on a field already holding "12" read "126". Tests edit a field once.

## Tests

Vitest for the pure parts (`studio-view`, the undo history, `control-height`)
and the export guard; Playwright for the behaviour: `studio-tab-persistence`
(views, tabs, group, scroll, Space round trips), `workspace-history`,
`shade-nicknames`, `control-height`. Full dev-mode Playwright run at the end:
550 of 553. The three failures were one test of mine that was fixed, and two
unrelated ones (`mobile.spec.ts` shade details sheet, `spacing-studio.spec.ts`
base-unit presets) that were not touched. CI builds for production, so its run
is the one that counts.
