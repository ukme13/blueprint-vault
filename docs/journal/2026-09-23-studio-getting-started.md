# 2026-09-23 — The first page written for us

Stage 3 of the studio guide plan: the route factoring the last entry left
open, the Button page's missing nav, and `/studio` — the first page in this
repository written for whoever operates the studio rather than for whoever
receives what it makes.

## The split, and what it is really about

Stage 2 ended with `DOCS_ROUTES` in the package barrel and a measured leak: a
throwaway internal route's label came back out of a shared bundle chunk of a
client handover while every page of it had been correctly held back. Every
client component in `apps/docs` imports `@blueprint/ui`, so anything the
barrel re-exports is reachable from a browser bundle.

So the list is split by audience, along the line of what each side needs to
know:

- `system/docs-routes` holds the rows a **client** receives, the shared types
  and the grouping. It stays in the barrel, and it is safe there because every
  one of those rows is published to that client anyway.
- `@blueprint/ui/docs-routes` is its own entry point and adds the rows a client
  never sees. Server components, tests and build scripts import it; nothing
  with `"use client"` at the top does.

The precedent was already here. `@blueprint/ui/primitive-usage` has its own
door because pulling `node:fs` through the barrel stopped the playground
compiling. Same rule, different cargo: what a module can reach decides where it
can end up.

## Undoing the split did not reproduce the leak, which was the useful part

The obvious check — re-export the internal entry from the barrel, rebuild,
expect a failure — came back clean. The reason is worth writing down, because
it changes what the split is for.

In stage 2 the internal rows sat in the same module as `clientRoutePaths`,
which `handover.ts` imports and the barrel exports. The module was retained
because something in it was used, and the rows came along. Now nothing
client-reachable references the internal entry at all, so a bundler is free to
drop it even when the barrel names it.

Which means the split does not work by hiding the module. It works by putting
the rows where nothing on the client side has a reason to pull them. Relying on
the tree-shaking is the version of this that breaks quietly the first time
somebody imports the entry from a component.

The real failure mode reproduces properly: put an internal row back into the
shared module and the archive check fails by name, five files deep, before
anything is shipped.

```
FAIL no internal route appears in the archive:
  pages/docs/button/index.html carries "/studio";
  pages/docs/button/index.html carries "Getting started"; …
```

## The Button page was a dead end

`/docs/button` is in the route list, so it appeared in every other page's
sidebar — and had no sidebar of its own, because it predates the frame and is
written in fixed Tailwind utilities rather than the Astryx layout. Reachable
from everywhere, and the one page you could not leave.

Its layout now carries the same nav panel. The frame is written out there
rather than borrowed from `FoundationsFrame`, which caps its column at 960 for
prose; the Button page is a specimen board of six schemes by six variants and
wants the width it is given.

## What the page says, and what nothing checks

Five sections: what the studio is, that it runs in this browser and nowhere
else, the nine routes, how changes and undo behave, and how a system gets out.

Two claims in it were checked against the code rather than remembered — there
are no API routes in the playground at all, and the library holds eight
workspaces — because both are the kind of sentence that is true for a year and
then quietly is not.

The rest is prose, and that is the honest limit of this stage. The foundation
pages are templates over a workspace, so a test can ask whether they still
describe it. A guide describes a tool, and nothing in this repository can tell
us when a sentence about `/preview` stopped being true. The scanner checks it
holds no hardcoded values; the archive check confirms a client never sees it;
neither has an opinion on whether it is any good or still accurate.

Content module rather than JSX for the usual reason and one more: a guide is
largely made of the values the scanner forbids. A sentence about the
25-interval grid has to be able to say 25.

## Checks

- `pnpm -r test`: 1168 in `packages/ui`, 39 in `apps/docs`.
- The barrel's shape is held by tests seen failing first — with the internal
  entry re-exported, both the key check and the value scan fail.
- `pnpm handover` then `verify-handover`, with a real internal route declared
  for the first time: 115 page files carried, 6 held back, every check passing
  including the archive scan. Seen failing against an internal row placed in
  the shared module.
- Lint at `--max-warnings 0`, types clean, Prettier clean.

## Lessons learned

**A guard that passes for the wrong reason is worth chasing down.** Undoing the
split should have leaked and did not, and the answer changed what the split is
for — from "keep the module out of the barrel" to "keep the rows away from
anything client-side that would pull on them".

**A page in a nav needs a way out.** The Button route was in the list the whole
time; adding a sidebar everywhere else is what turned it into a trap. Worth
checking the next time a route is added to that list and not to the frame.

**Prose has no test.** Everything else in this application is checked against
the workspace it describes. This page is checked for what it must not contain
and for nothing it should. That is not an argument against writing it — it is
an argument for re-reading it whenever a route moves.

## The frame gained two regions and lost its cap

Asked for after the pages were written: the Button page's layout everywhere,
and an on-page nav on the right the way Astryx's own documentation has one.

Both halves were worth taking apart before doing.

**The cap.** The Button page fills its column because it is a specimen board of
six schemes by six variants. The foundation pages were capped at 960 with a
comment saying why — a line of prose has a readable length. Copying the Button
page wholesale would have made every paragraph as wide as the screen, which is
a poor look on a design system's own documentation, and the reference that was
attached does not do it either: Astryx caps its text column too.

So the cap moved rather than went. `Prose` now carries a measure of `68ch`,
and the frame caps nothing. A paragraph stays readable, a token table with both
modes across it gets the whole width, and the two stop having to agree. In
`ch` because a measure is a count of characters and should follow whatever face
and size the reader actually has. The scanner allows it: it matches `px` and
`rem`, and exempts `max-width` besides.

**The nav.** It is generated from the sections, so the frame had to render them
— which is why `FoundationsFrame` now takes a `sections` array instead of
children. That is the third time this shape has come up in three stages: one
list, two readers, because the alternative is a table of contents written out
beside the sections it describes and drifting from them. `GuidanceBlock` was
already `{ heading, paragraphs }`, so a page spreads its prose in and appends
the sections that carry data.

Nothing is marked as current in that column. A scroll spy needs a client
component watching the viewport, and a highlight that lags is worse than none —
a reader told they are in the first section while looking at the fourth stops
trusting the column. Worth adding; not worth faking.

**Two things this got wrong on the way.** Anchors were truncated to four words
and produced `#what-each-step-looks`, which reads as a bug rather than as a
shortening; they are the whole heading now. And the edit that fixed it did not
apply — a script reported success without asserting its replacement had
matched, and the archive was rebuilt twice before the old slugs in the output
gave it away. A patch that cannot fail is a patch that cannot be trusted.

## Rebuilt against a reference file

A complete HTML layout came with the next request: fixed header, three
columns, sticky sidebar and table of contents, footer, and a scroll spy. The
file said what to do with it — "replace the values in `:root` with your own
design system tokens" — which is most of the work, because this application
forbids every value that file is made of.

Astryx's `Layout` already has the five regions, so the shell is its slots
rather than a grid written by hand. What went into `globals.css` is the part
`Layout` leaves open: what sticks, what scrolls, what folds away at 1200 and
at 800, and the two nav columns' own look.

Three kinds of raw length survived translation, and the file should not grow a
fourth. Structural widths and heights, which the layout guide names as the one
place a raw length belongs and the scanner exempts. `1px` hairlines. And a
`ch` measure, which is a count of characters rather than a length.

## Three things the tests caught that reading would not have

**`0px` is a length even when it is not.** The scroll spy's observer margin was
`-20% 0px -70% 0px`, straight from the reference. The scanner reported it, and
it was right to: the rule is that this application writes no lengths, and an
exception for "but this one is a viewport share" is how an empty allowlist
stops being empty. It is percentages throughout now, zeros included.

**Two type tokens did not exist.** `--font-size-label` and
`--font-size-caption` are the sort of name a design system ought to have, and
this one does not — its type scale is numbered steps, because that is what the
workspace generates. `findUndefinedCssVars` caught both.

The fix is better than the names would have been. The nav labels take their
size from Astryx `Text`, so the chrome asks the theme rather than naming a
token — which matters more than it looks, because these pages are a template
over _any_ client's workspace and a client's scale is not ours.

**There was no `main` landmark.** Found by a test that could not select one: a
header, two navs and a footer, and no way for a screen-reader user to skip to
the content. `LayoutContent` takes `role` and `label` and now gets both.

## The scroll spy, and what its test asserts

`IntersectionObserver` over the section elements, in the frame's only client
component. The ids are in the HTML and the links are anchors, so with no
JavaScript every link still works and only the highlight is missing — the
right thing to lose first, and what a reader in a handover folder depends on.

The test asserts the marker moves _forward_ rather than that it lands on a
named section. The first version asserted the last section and failed while
the column was behaving correctly: which section is current at the bottom of a
page depends on how tall the last one is and where the observer's band falls
across it. Both real, neither anything to do with whether the spy works.

## A repeat of yesterday's mistake

A `split().join()` over a selector did not match, because Prettier had wrapped
the line since it was written. Reported success, changed nothing, and cost two
runs to find — the second time in two days that a patch without an assertion
has lied about its own result. The rule is now simple enough to keep: a
replacement asserts it matched, every time, including the ones that are
obviously fine.

## Four things a screenshot found

The shell went out with a header in the page flow, two nav columns as tall as
their content, and a purple square where the brand goes. None of it was caught
by a test, and three of the four had the same cause.

**`height: fill` needs a parent with a height.** `body` had `min-height: 100%`,
which resolves to nothing for a child asking for `height: 100%` — so Astryx's
`Layout` laid itself out at content height, the whole document scrolled, and
the header went up with it. One line: `height: 100%` and `overflow: hidden` on
the shell, and the header stays, the two nav columns hold, and each region
scrolls on its own.

That one line is the answer to three of the four reports. Worth remembering as
a shape rather than as a fix: a frame that fills is a claim about its
container, and `min-height` is not a height.

**The brand was a placeholder.** `public/blueprint-logo-horizontal.svg` was
sitting right there and is `fill="black"`, so on a dark page it would have been
a black rectangle. The drawing the studio uses is `currentColor` throughout, so
it moved into `packages/ui` — a second application needing the same component
is the repository's own rule for when something becomes shared — and the rail
keeps its sizing wrapper around it. One copy of a path that long, two callers.

## Tests that were written after the fact, and made to fail first

Three assertions now cover what the screenshot showed: the header's box does
not move while the content scrolls, both nav columns' boxes do not move, and
each column computes to `overflow-y: auto`.

They were checked against the broken state rather than trusted. Reverting the
one line fails two of the three, which is the right number — a column that
scrolls on its own was already true and was not the bug.

The header test asserts the content actually moved before asserting the header
did not. Without that it passes on a page that never scrolled, which is the
same failure it exists to catch, wearing a green tick.

## The shell scrolls the page again

Three more off a screenshot, and the first two are the same decision reversed.

**`height="fill"` was the wrong model for a document.** It put the content in
a scroll container in the middle of the layout, and a container is not what
`scroll-behavior: smooth` is declared on — the rule sits on `html`, a fragment
link inside a container is the container's business, and the two never meet.
So the table of contents jumped where it should have glided, and no amount of
looking at the smooth-scroll rule would have explained it.

`height="auto"` puts the scrollbar back on the document. The header and the
two nav columns say `position: sticky` for themselves, which is what the
reference file did all along and what this should have copied rather than
improved on. Astryx's own panel slots clip their overflow, so the two
containers above them are set to `overflow: visible` or a sticky child inside
them never sticks.

**The footer left its slot.** A footer in a layout region is a bar pinned
under the page; a footer at the end of the content column is the end of the
reading. It is the second, now.

**The header was 44px with nothing to spare**, so its divider sat against the
text rather than under it. 56, and the bar fills its own height so the mark
and the mode control centre against the line instead of resting on it.

## The motion test is a pair, because the suite runs reduced

Asserting `scroll-behavior: smooth` failed, and it was right to: this suite
runs under `reducedMotion: "reduce"`, so `auto` is the correct answer and the
media query written two commits ago was doing its job.

So there are two tests. The default context asserts a reader who asked for
less motion gets a jump; a second context, `no-preference`, asserts the other
one glides. Both assert the declaration rather than the easing — watching a
scroll position ease is asserting the browser's animation, which is the
browser's to get right.

**A test that fails because the code is correct is worth reading twice.** The
first instinct was to force the assertion through; the useful move was to ask
what the suite was already telling the browser.

## Spacing, a logo, and a footer that ends the page

**The paragraph rhythm was off by a step.** The reference sets 16px between
paragraphs and 32px between sections; this had 12 and 24, so a paragraph break
and a section break read as nearly the same pause and the column ran together.
The scale here lands on those numbers exactly — `--spacing-4` is 1rem and
`--spacing-8` is 2rem — so it is `gap={8}` between sections and `gap={4}`
within, and the rendered page now carries one gap of 8 and one of 4 per
section.

Worth saying plainly: the numbers were a guess the first time. They are the
reference's now, and the reference's happen to be the two everybody uses.

**The mark is 24px.**

**The footer has two rows and room above it.** It sits `--spacing-16` clear of
the last section with a rule across the top, because a footer a paragraph away
from the reading is one more paragraph.

Its links are the routes, out of the same list the sidebar and the archive
guard read. That was the only honest way to build the reference's row: there
is no blog, no community and no social account here, and a footer of dead
links is decoration pretending to be navigation. It also means a client's
footer has no studio link without anybody arranging that separately.

But it is a new place a route name can reach a page, and one the archive's
path guard cannot see — that guard reads file names, not their contents. So
the footer has its own unit test for the same claim the sidebar has, and
`verify-handover` confirms it against a built archive.

## A scanner failure that was my own mess

Two scanner tests failed naming `--color-neutral-50` and friends in
`out/_next/static/css/…`. Nothing was wrong with the source: a `next build`
run by hand leaves `out/` behind, the scanner reads the whole application root,
and build output is full of the values a page may not write.

`scripts/handover.ts` deletes `out/` after copying for exactly this reason, and
says so in a comment. A build run outside that script has to do the same
tidying by hand — which is now two hours of my life and belongs here so it is
not a third.

## The header line, measured rather than guessed

The mark looked off-centre and the divider looked like it was touching it. The
useful move was to stop looking and measure: a throwaway spec that walked up
from `.site-header` printing each ancestor's box and padding.

```
site-header            top 16  h 28  pad 0/0
(astryx wrapper)       top  0  h 60  pad 16px/16px
astryx-layout-header   top  0  h 56  pad 0/0
```

There it is. Astryx wraps a header's children in a box that pads 16 above and
below and sizes to its content, so a 28px control came to 60 inside a bar
declared at 56. The wrapper overflowed by four, and the divider is drawn on the
bar rather than on the wrapper — so the line crossed the mark instead of
sitting under it.

Making that wrapper exactly the bar's height, as a flex box that centres what
it holds, is the whole fix. 15.5 above and 16.5 below now, the half-pixel being
the bar's own hairline counting in its height.

**The first fix included something that did nothing.** `padding-block: 0` went
in alongside, on the theory that the padding was the problem. Taking it out
again changed no measurement and failed no test, so it came out — a line that
does nothing is a line the next person has to reason about.

## The footer spans the region, not the column

It was inside the reading column, which is capped so a line of prose stays
readable. A footer is a rule across the page, and a capped rule stops short of
the width it is ruling off. Outside the column now: 1268px against the column's
768 at a wide viewport, which is the content region less its own padding.

Worth being precise about what that does and does not do. It spans the
_content region_. The reference spans the content and the table of contents
together, which would mean lifting the footer out of the layout slot
altogether — a bigger change than the one asked for, and one to make on
purpose rather than on the way past.

## Two more tests, one of which does not fail

The mark's centring and the footer's width are both asserted now.

The centring test passes against the version with the redundant padding rule,
because that rule was not what fixed anything — which is the test doing its
job and saying so. It fails against the original, which is the state that
mattered.

## The contents column joins the content

It was a region of its own, which put a hard edge down the page: the footer
below it could only ever rule off the middle column, and stopped a whole
panel's width short of the scrollbar. So the reading column and the contents
column are now a two-column grid _inside_ the content region, and the footer
spans both — ending where the contents column ends, 24px from the edge.

That is what the reference did all along. Its footer is `grid-column: 2 / -1`,
which is the same statement in the same words: a rule across the bottom of a
page rules off everything above it.

Two things broke on the way, and both were worth the trip.

**`LayoutContent` is a scroll container by default.** `isScrollable` defaults
to true, and a sticky element inside a scroll container sticks to that
container rather than to the page — so the contents column scrolled away with
the text beside it, having stuck perfectly while it was a region of its own.
The page owns the scrollbar here, so nothing inside it should own a second
one: `isScrollable={false}`.

That is the third time in this stage that something was sticky-in-name-only
because of an ancestor's overflow. It is worth stating as the rule it is:
**sticky is relative to the nearest scrolling ancestor, and a scrolling
ancestor is easy to acquire by accident.**

**Nothing was marked at the top of a page.** The observer watches a band
across the upper third of the viewport, and with the page scrolling rather
than a box, the title and the lead fill that band at rest — so no section
intersected it and the column showed no current item, on the one screen where
a reader is most certain where they are.

It falls back to the first heading until the observer says otherwise, which is
what a reader would assume anyway. A test caught it; a glance would not have,
because the highlight appears the moment you scroll.

**And one duplicate landmark.** The wrapper had `aria-label="On this page"`
and so did the nav inside it, which is two regions with one name in the
accessibility tree. The wrapper is for layout and is unlabelled now.
