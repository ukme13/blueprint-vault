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

## The colour chip test, the same week

`semantic-table.spec.ts` › "the colour chip opens the reference picker" also
failed on a local production build, and on `main`. It reported the chosen
option out of view after reopening the chip. Probed, the option was fine; the
popover had not reopened at all.

The test clicks the chip the moment the list reports hidden. Astryx keeps its
popover state in step with the browser's `toggle` event, which fires
asynchronously after the popover hides, and a trigger click that lands before
it is handled against the stale state and dropped. Measured: a click 0ms
after a choice is lost, and 100ms or later opens every time. Nobody sees a
list close and clicks again inside 100ms, so this is the test's race, not
the app's. That is the difference from the Escape bug, where an Android back
gesture during the slide-out could reach it.

So the test reopens the chip with a retry, a click and then up to a second
to show, for up to five seconds. A popover that never reopens still fails.
With the list's centring switched off, the test still fails on the option
being out of view, which is what it is for.

**A test that passes on dev and fails on a production build is not flaky by
default.** Both failures here were deterministic once the timing was a
production build's, one of them in the app and one in the test. It took a
probe on the real build to tell which was which.

## Two more, from the full suite

With both of those fixed, a full production-build run turned up two tests
that failed only under the load of the whole suite, and passed alone.

- `mobile.spec.ts` › "opens a track's details in a sheet" closed the nested
  picker with Escape, waited for it to be hidden, and then measured the track
  sheet for overflow. The picker is still an open `<dialog>` inside that
  sheet while it slides away, so under load the scan caught it mid-exit
  ("390 in 388"). It now waits for one `dialog[open]` before measuring.
- `typography-editing.spec.ts` › "stays against it with no room below, and
  on every reopen" reopened a Selector straight after Escape: the colour
  chip's race again. It gets the same retry.

Each passed five of five after the fix, and the full suite 441 of 441.
