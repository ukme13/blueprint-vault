# 2026-09-23 — Mobile, measured

Reported after launch: both applications unusable on a phone. Four fixes, and
three of the four causes were not what the report guessed — including one that
was mine and had been shipping since the studio guide landed.

## Measure first, because a responsive bug lies about itself

Nothing here was diagnosed by reading CSS. Each fix started with a throwaway
spec at 390×844 printing boxes, and each one changed the plan.

**The documentation's reading column was 70px wide.** Not the sidebar, not the
tables — the column itself, on a 390px screen. `.doc-body` declares its two
columns at line 441 and the `@media (max-width: 1200px)` that collapses them
sat at line 364. Same specificity, earlier in the file, so the breakpoint never
applied at any width: a 240px track and a 32px gap were still being reserved
for a contents column that was itself correctly hidden. 390 − 32 − 240 − 32 −
16 = 70.

That is mine, from the stage where the contents column moved into the content
grid and its old breakpoint was left where it was. It survived a launch.

The fix is to put the responsive rules at the end of the file, with a note
saying that is load-bearing rather than tidy. Then, within ten minutes, I
appended the mobile menu's base rule _after_ them and hid the toggle I had just
added — the same mistake, in the same file, while writing the comment warning
about it.

**The studio's rail was not the problem it looked like.** The report said a
260px rail eats a 390px screen, and it did. But Astryx's `AppShell` already
moves the rail's destinations into a drawer below `md`; what it cannot do is
stop a CSS module forcing `width: 260px` on the element it moved. Scoping that
width to the widths that have room for a rail let the shell do what it wanted.

And that uncovered the worse half. With the rail out of the way the bar across
the top measured 48px tall and held **no items at all** — they were in the
drawer, and the drawer had no toggle, because `AppShell` hangs its toggle on
the `topNav` slot and studio routes pass none. Every destination was
unreachable. `mobileNav={{ breakpoint: "md", hasToggle: true }}` is the whole
fix, and no amount of reading the rail's stylesheet would have found it.

## What was already right

Worth recording, because the brief asked for all of it.

The Astryx table wrapper already had `overflow-x: auto` and 0.2.0 had
deliberately kept it. The palette workspace already collapsed its editor to one
column at 900px and its contrast grid to one at 640. `/overview` and
`/typography` had nothing escaping at 390px.

So the table work was a `max-width: 100%`, a `-webkit-overflow-scrolling` for
the iOS versions that still ask, and tighter margins in the gutter. Three of
the four "stack the controls" targets needed nothing.

The one that did: a spacing token row is five fixed columns — 8rem, 4rem,
4.5rem, 2.75rem and the bar — which reserves 356px before the bar is drawn. On
390px the bar had six pixels and the largest steps were clipped. It wraps now.

## The tests, and one I had to fix twice

`mobile.spec.ts` in both applications, at 390×844, asserting what the
screenshots showed: the column gets the screen, the document never scrolls
sideways, a wide table scrolls inside its own frame, the drawer opens and
reaches every section, Escape closes it, and above the breakpoint the sidebar
is back and the toggle is gone.

The studio's version does not assert that nothing is wider than the viewport —
the shade matrix is 940px and is supposed to be. It asserts that nothing
_escapes_: wider than the screen with nothing between it and the body that
scrolls. That is the difference between a table you can swipe and a control
pushed off the edge.

The drawer test failed about half the time under four workers and passed every
time on its own. Not flake: these pages are a static export, so the toggle is
in the HTML immediately and does nothing until React attaches its handler, and
Playwright was clicking in between. It waits for the element to carry React's
`__react*` keys now — reaching into an internal, and the only honest signal
for "this is a button rather than a picture of one".

## Lessons learned

**A later rule of equal specificity wins, and a stylesheet does not read in
specificity order.** Two breakpoints in one file, one of them mine, both dead
for the same reason. If a media query is not doing anything, look at what comes
after it before looking at what is in it.

**A framework that already handles something will fight you for it.**
`AppShell` had a mobile drawer the whole time. The bug was a width the studio
insisted on and a toggle nobody had turned on, and the report — reasonably —
described the symptom as the rail being too wide.

**Check what is already right before building it.** Half this brief was
already done. Writing the tables' scroll container again would have been work
that looked like progress.

## What a real device said that an emulator did not

A second round, from testing on hardware. Two of the three reports were caused
by the first round's fixes, which is the honest shape of this kind of work.

**The theme control was overlapping the first paragraph.** `.site-header` is a
three-column grid — mark, sections, actions — and the menu toggle was added as
a fourth child. Grid put it in column one, pushed everything along, and the
actions, pinned to column three, landed in an implicit second row: measured at
390, 640 and 800, the control sat at y=60–88 in a bar 68px tall, with the `h1`
at 92. The toggle now shares the first cell with the mark and the grid is three
wide again.

**The rail was springing.** Animating a width from 52px to 260px against a
390px screen leaves 115px and reflows the whole studio twice per tap. That is
not an easing problem, and the fix is the one that was asked for: below 768px
the rail leaves the flow. `position: fixed`, off-canvas, slid in over a
backdrop by transform rather than width, so the page underneath does not move
at all. Measured: the canvas is 389px with the drawer shut and 389px with it
open.

In CSS rather than behind a JavaScript breakpoint, so the first paint is right.
The first round had leaned on `AppShell`'s own mobile swap, which decides after
hydration — plausibly the flash the report described as violent.

## Three attempts at the same rail

Worth recording, because each failure taught the next.

`mobileNav={{ hasToggle: true }}` — AppShell's drawer, which worked in
emulation and left a real device with a 48px bar of nothing.

`mobileNav={false}` — which does not mean "leave my nav alone", it means the
rail is not rendered on a narrow screen at all. Measured: no `.astryx-side-nav`
in the document.

`mobileNav={{ breakpoint: "none" }}` — AppShell keeps the rail inline at every
width and the stylesheet owns the drawer. One mechanism, no hydration
dependency.

And then the same lesson as the docs, one fix later: with the drawer fully
off-canvas, the rail's own expand control goes off-canvas with it, and every
studio route was unreachable again. A fixed trigger stays behind.

## Already right, again

The shade grid's scroller was already `overflow-x: auto` at 353px wide against
940px of content, and nothing escaped it. It gained
`-webkit-overflow-scrolling` and `overscroll-behavior-x: contain` and no more:
what the report read as the grid breaking the page was the rail taking two
thirds of it.

## Lessons learned

**A fix is a change, and a change is a new bug until it is measured.** The
overlapping theme control and the missing rail trigger were both mine, both
introduced while fixing something else, and both found the same way — by
printing boxes rather than by looking.

**A prop named for the thing you want can mean the opposite.** `mobileNav
={false}` reads as "no special mobile handling" and means "no navigation".

## Round three: the drawer you could see through

From hardware again, with screenshots. Measured first at 390 and 430px, and
the measurements narrowed three reports to two real bugs and one design
problem.

**The drawer had no background.** In its column the rail sat on AppShell's nav
region, which painted the ground behind it. Fixed and out of that region it had
none of its own — computed `rgba(0, 0, 0, 0)` — so the palette cards showed
straight through the menu. It is `--color-surface-base` now, with
`--shadow-high`.

**The scrim was a surface.** The backdrop used `--color-surface-overlay`, the
seeded semantic role that is near-white in light mode. So instead of dimming
the page it washed it out, and a transparent menu over a pale page read as one
mess. It uses `--color-overlay` now: Astryx's scrim, the one its own dialogs
sit on, which this theme sets to 50% black in light mode and 80% in dark.

Asked for as `rgba(0, 0, 0, 0.45)` and a literal shadow. Tokens instead,
because the studio's chrome takes no raw colours, and because a scrim that
matches every other dialog in the app is worth more than one that matches a
number. Light mode, where the screenshots were taken, lands at 0.5.

**The top bar was already two rows.** Actions at y=0–36, tabs at y=48–84, the
trigger clear of both, at both widths. What looked cramped in the screenshot
was the transparent drawer's own collapse button sitting over "Import". The
tabs gained `white-space: nowrap` as asked; see below for what that did.

**The toolbar was the design problem.** It already scrolled, and nothing
escaped the screen — which is why last round's overflow test passed. But it
was a single line that grew from 415px at rest to 657px with WCAG open and
1019px with Vision open, and scrolled itself so that Add colour sat at x=−253
while the options just opened hung off the right edge. You tapped a toggle and
what it opened was not on the screen.

Both the requested fixes were offered — a scrolling strip, or opened panels on
a row of their own — and they cannot both hold: the panels live _inside_ the
row of buttons, so a single scrolling line can only push them sideways. Below
640px the toolbar wraps now and each opened panel takes a full row, with the
Vision group dissolved by `display: contents` so its button stays in the line
and its selector and slider can drop below. At 430px the buttons still fit on
one line; at 390, Reset preset takes a line of its own.

## A test that never failed, kept anyway and labelled as such

"Keeps the studio tabs on one line" passed against the stylesheet without
`nowrap`, at 390px and then at 320px. The tab items already hold one line in
Chromium. I had written in its comment that 320 was where "Shade generator"
breaks, before checking — it does not, and the comment now says so.

It stays, because the report came from a real device, where a larger text
setting is exactly what breaks a label onto two lines. But it is written down
as a guard that has never caught anything, which is a different thing from a
test, and the repository's own rule is that the difference matters.

The drawer and toolbar tests both fail against the state on the device.

## Lesson

**Measure where the thing lands, not only whether it escapes.** Last round's
overflow test was right and useless for this: nothing left the screen, and a
toggle opened its controls somewhere you could not see them. The new test
looks for controls off either edge after opening both panels, which is what a
thumb experiences.

## Round four: the options go into a sheet

The wrapped toolbar from round three worked and read as three rows of
settings. This round the strip goes back to one line that swipes, and WCAG 2
and Vision on a phone open a bottom sheet instead of growing inline: a title
and close button, the controls, and Reset / Cancel / Apply. Astryx's
`BottomSheet` supplies the slide, the scrim, the focus trap and the swipe;
`SettingsSheet` adds the header and footer both sheets share.

The sheet edits a draft. Only Apply commits it; Cancel, the close button,
Escape, a swipe and the scrim all discard. That is what makes dismiss-on-scrim
safe. The draft logic (`visionSettingsOf`, `withVisionSettings`, the
draft-to-open helpers) is in `packages/ui` with unit tests, per the rule that a
value-in, value-out function is domain logic.

Each sheet has an on/off switch the desktop does not. On a desktop the chip
is the switch; on a phone the chip opens the sheet, so without one a
simulation turned on from a phone could not be turned off from it.

A chip that is on is filled with the primary colour. The desktop's tint read
as "hovered" at arm's length.

The top bar got 12px above the controls (or the safe-area inset, once a page
opts into one), and the menu button moved down to match, so it and Export
share a top edge. Measuring every route for text under the fixed button found
two collisions the palette studio did not have: Overview's heading and the
Scale tab. Overview's bar now starts past the button; Scale's bar takes the
palette's arrangement, with actions on the first line and tabs on their own.

## The dev server, not the tests

With the new per-route test, `page.goto` aborted on a different route each
run against `pnpm dev`, with "Fast Refresh had to perform a full reload" in
the log. That included the old "keeps every control inside the screen" tests.
I did not retry on dev. I ran the spec once against `pnpm build && pnpm
start`, which is how CI runs it, and all 19 passed. Each of the six new tests
then failed against a build with its rule removed.

## The sheet inherited the toolbar

On a device, the Vision sheet showed a grey line under its footer and a faded
title. The grey line was a horizontal scrollbar: the switch description sat
on one line, 400px wide in a 388px sheet. `width="100%"` on the Switch did
nothing. Walking up the ancestors found `white-space: nowrap` on every one of
them. The sheet is rendered beside its chip, inside the toolbar, and a dialog
in the top layer still inherits from where it sits in the DOM. The one-line
toolbar rule was wrapping nothing in the sheet. The fix is `white-space:
normal` on the sheet itself.

The fade is Astryx's grab handle, which floats over the first 24px of content
with a gradient to transparent. The title started 8px down, so it sat inside
the fade. The sheet now pads its top by the handle's height, `--spacing-6`.

**A rule set on a container reaches everything portalled or top-layered
beneath it in the DOM.** Rendering somewhere else on screen is not the same as
being somewhere else in the tree.
