# 2026-09-25 — Escape closed every stacked sheet

The e2e suite's move to production builds turned up a test that failed
every time locally, and on `main` too: "switches colour format from inside
every sheet". It had passed under `next dev`, and on CI.

It was a real bug. With three sheets stacked on a phone (a track's details,
the colour picker, the format picker), an Escape pressed while the top sheet
was still sliding away closed all three.

## Why

`Sheet` already stopped Escape's `keydown` from bubbling, so a nested sheet's
Escape stayed its own. That covers a keypress with focus inside the sheet.
During the slide-out, focus has already moved to the body, so no sheet's
keydown handler sees the key. The browser sends `cancel` to the top modal
dialog instead, which is the one still closing. The DOM `cancel` event does
not bubble, but React carries it up its own component tree. The sheets below
are ancestors in that tree, so their `onCancel` ran as well. Probed on a
production build: `cancel` on the format sheet, then no open dialogs.

`Sheet` now stops `cancel` at the same wrapper as `keydown`. React's types
only allow `onCancel` on a `<dialog>`, but React calls it on any element the
synthetic event passes through, so the wrapper takes it through a typed
spread.

On a phone this is an Escape, or an Android back gesture, during a sheet's
~300ms exit.

## Tests

- New: "closes only the sheet that is sliding away when Escape comes early".
  Without the fix it fails with 0 sheets open instead of 2.
- The old test pressed Escape during the slide-out and expected the picker to
  close. It only passed because of the bug. Its `choose` helper now waits for
  the format sheet to close, not just to be hidden.
- Under `next dev` the timing was different and the race never showed. It
  showed on the first production-build run, which is what that change was
  for.

## Not fixed here

`semantic-table.spec.ts` › "the colour chip opens the reference picker" fails
on a local production build, on `main` as well. Reopening the chip should
centre the chosen option, and the option isn't fully in view. It came with
#154, and it is left for its own branch.
