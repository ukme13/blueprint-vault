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
