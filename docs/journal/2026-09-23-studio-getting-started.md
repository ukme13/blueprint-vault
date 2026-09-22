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
