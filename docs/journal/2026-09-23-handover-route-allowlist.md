# 2026-09-23 — What a client is allowed to receive

Stage 1 of the studio guide plan: the mechanism, with nothing written on top of
it yet. `apps/docs` is about to grow pages that are not for clients, and the
archive had no opinion about which of its pages were.

## The hole, before anything was built

`unexpectedHandoverPaths` guarded the archive's top-level files against what
produced them and waved through everything under `pages/`:

```ts
(path) => !known.has(path) && !path.startsWith(`${HANDOVER_PAGES_DIR}/`);
```

So `scripts/handover.ts` copied `apps/docs/out` wholesale and the guard agreed
with whatever arrived. Any route added to the documentation app reached every
client, and nothing about adding a page to a Next app suggests that it would.

## An allowlist, because a prune is a subtraction somebody forgets

`HANDOVER_ROUTES` is `["foundations", "docs/button"]`. The copy carries the
routes on that list and the guard reports anything in the archive that is not
on it — one rule, two readers, so what is copied and what is allowed cannot
disagree.

The direction is the point. Stripping known-bad routes ships a guide written in
six months unless somebody remembers; listing known-good routes fails the build
until somebody declares the new one. The failure names the file.

`output: "export"` cannot skip a route — it exports everything under `app/` —
so the selection had to happen at the copy rather than at the build. That was
the correction that came back with the plan's approval, and it is why the guard
earns its place: the copy decides, and the guard checks the decision against
the same list rather than trusting it.

## `_next` is not shared, and a build proved it

The rule looked complete: allowed routes by name, the bundle and the 404 as
shell, root-level files waved through because `trailingSlash` means a route can
never be a bare file.

Then a throwaway `app/studio/page.tsx` was built through the real command, and
the archive came back holding this:

```
_next/static/chunks/app/studio/page-65e2d04ce547cea5.js
```

Five HTML and RSC files held back, and the route's compiled component shipped —
because under `_next/static/chunks/app/` the bundle mirrors the route tree. The
pages were absent and the JavaScript was there, with whatever prose the
component holds inlined into it.

Nothing in the design suggested it. `_next` reads as "the bundle", one shared
thing, and it is one shared thing except for the part that is per-route. The
only reason it was found is that the probe was built and the output was looked
at rather than reasoned about.

So `_next/static/chunks/app/**` is gated by the same route list, with two
carve-outs that are the root route's own chunks and Next's internal entries —
`_global-error`, `_not-found` — which are named with a leading underscore that
no route of ours has. Dropping those would leave every page in the archive
broken, which is a worse failure than the one being guarded against.

## Checks

- 19 tests on the guard, up from 2. Each new one seen failing first: against
  the blanket pass, against a predicate that returned true for everything, and
  the chunk test against the shell rule as it was written an hour earlier.
- `pnpm -r test`: 1153 in `packages/ui`, 30 in `apps/docs`.
- The probe route, end to end: with `app/studio` present the archive carries
  114 page files and holds back 6, and `handover.zip` has no entry matching
  "studio". Without it, 114 and none held.
- The archive is **file-for-file identical** to the one built before this
  change — 114 files, the same six foundation routes, `docs/button`, the 404
  and not-found shell — once Next's per-build hash directory is normalised,
  which moves on every build regardless.
- Lint at `--max-warnings 0`, types clean.

## Lessons learned

**A rule about what ships has to be tested against a build, not against its own
reasoning.** Every unit test passed while a route's code was shipping. The
predicate was right about the paths it was asked about, and wrong about which
paths existed.

**Shared output is rarely entirely shared.** `_next` is the bundle, except for
the directory inside it that mirrors the route tree. The general shape — one
opaque blob that turns out to have structure in it — is worth suspecting
anywhere a build is being filtered rather than assembled.

**The throwaway probe was the cheapest part of this.** Four lines of TSX, one
build, deleted afterwards. It found the one thing that would have shipped, and
it would have kept shipping quietly for as long as nobody unzipped an archive
and read the file list.
