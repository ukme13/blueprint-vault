# 2026-09-23 — Who a build is for, and a nav that knows

Stage 2 of the studio guide plan. One list of routes, read by the sidebar, the
home page, the copy that fills a handover and the guard that checks it.

## The audience is not the output format

`BLUEPRINT_STATIC=1` means `output: "export"`. It has meant "this build becomes
a handover" only because `scripts/handover.ts` is the only caller that sets it,
and that coincidence was about to become a bug: the internal documentation site
will be a static export too, so a nav keyed on the output format would hide the
studio guide on exactly the site that exists to carry it.

So `BLUEPRINT_AUDIENCE`, `client` or `internal`, unset meaning internal. The
handover script says `client`; nothing else says anything.

Unset falls to internal, and an unrecognised value throws. That asymmetry is
deliberate. Unset is a decision — local development, a deployment nobody has
thought about — and `internal` is the safe answer for it. A misspelled
`clientt` is not a decision, and falling to the same default would put the
studio guide into a client's archive through a typo, which is the one failure
the whole mechanism exists to prevent.

## A test that passed by describing an empty set

`DocsNav` first read `docsRouteGroups(audience)` itself, and its test asserted
that a client build renders no Studio section. It passed. It would have passed
against any implementation at all, because the real route list has no studio
routes in it yet — the pages arrive in stage 3, and a generated nav cannot be
told that one of its links is aspirational.

So the nav takes the groups and decides nothing. Who gets which rows is
`docsRouteGroups`'s call, tested where it is made against a fixture that does
have an internal route in it. The component's test now renders both a list with
a Studio group and a list without, and can tell them apart.

Worth keeping as a shape: **a test written against real data that has not
arrived yet is a test of nothing, and it goes on passing after the day it stops
being true.**

## The leak the probe found this time

Stage 1 found a route's compiled chunk shipping under
`_next/static/chunks/app/<route>/`. The same technique — declare a throwaway
studio route, build a client archive, read every byte — found a second one, and
this one is not fixed here.

Every client component in `apps/docs` imports `@blueprint/ui`: `ThemeControl`,
`theme-provider`, `theme-mode`, and the Button page. The barrel re-exports
`docs-routes`, so `DOCS_ROUTES` reaches the browser bundle **in full**,
including rows whose audience is internal. The probe's label and description
came back out of a shared chunk:

```
pages/_next/static/chunks/911-d337354f7fabf8e4.js :: "PROBE Getting started"
```

Every page of it was correctly held back. The metadata shipped anyway, through
a door that has nothing to do with routes: a package barrel that any client
component can pull on.

Nothing leaks today, because no internal route exists to leak. The check below
will fail the moment stage 3 declares one, which is the right place for this to
stop — but the fix is a restructure and wants deciding rather than assuming.
The shape it probably takes: `packages/ui` owns what a _client_ may receive,
which is what the archive guard needs, and the docs app owns the rows it
additionally shows itself. The package has no business knowing the studio
guide's page list.

## A check that can tell a leak from the word "studio"

`verify-handover.ts` now reads every entry in the archive and looks for the
internal routes by name. The first version searched for the bare path and
reported eight hits on a clean archive, because this workspace's own prose says
"the studio's own preview template" and "open it in the Blueprint studio".

A check that cries wolf on correct output is worse than no check, because it is
switched off within a week. So it searches for path-shaped occurrences —
`/studio`, `studio/` — and for the route's label, which is distinctive as it
stands. Against the probe archive that matching found exactly one hit, the real
one, and none of the prose.

## Checks

- `pnpm -r test`: 1163 in `packages/ui`, 39 in `apps/docs`.
- The nav's client and internal renderings, the audience helper's default, and
  its refusal of a misspelled value — all seen failing first.
- `pnpm handover` then `verify-handover`: every check passes, including the new
  one, which currently reports that there is nothing to look for.
- Lint at `--max-warnings 0`, which wanted `BLUEPRINT_AUDIENCE` declared in
  `turbo.json` beside the other two. Types clean.

## Lessons learned

**A flag means what it says, not what it currently implies.**
`BLUEPRINT_STATIC` and "this is for a client" happened to coincide, and
building on the coincidence would have been free right up until the internal
site shipped.

**A barrel export is a distribution channel.** Anything re-exported from
`@blueprint/ui` can land in a browser bundle, because it only takes one client
component importing the package for the whole module graph to be reachable.
That is fine for tokens and pure functions and is not fine for a list that has
an audience column in it.

**Probe, build, read the bytes.** Twice now the thing that shipped was not the
thing the rule was written about. Both times it cost one throwaway file and one
build.
