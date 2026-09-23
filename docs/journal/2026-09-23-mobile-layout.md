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
