# The studio guide, and what a client is allowed to receive

## Goal

Write the studio down. Nine routes, anchors, undo, simulation, uploaded fonts,
alpha, and a handover command have no user-facing documentation anywhere — the
knowledge is in forty-three journal entries written for people who already
know.

And, in the same change, make it impossible to hand that documentation to a
client by accident. `apps/docs` is not an internal site: `pnpm handover` builds
it and copies the whole thing into the archive. Everything in that app ships.

## What exists today

- `apps/docs` renders six foundation pages and `/docs/button` from a checked-in
  workspace, and every one of them is in the archive. Verified: a built
  `handover/pages/` carries `docs/button` alongside `foundations/*`.
- `BLUEPRINT_STATIC=1` already marks the handover build. It turns on
  `output: "export"` and `trailingSlash`, and `scripts/handover.ts` is the only
  caller.
- `unexpectedHandoverPaths(written, files)` guards the archive — and waves
  through **everything** under `pages/`:

  ```ts
  (path) => !known.has(path) && !path.startsWith(`${HANDOVER_PAGES_DIR}/`);
  ```

  So the archive's top-level files are checked against what produced them, and
  its pages are not checked at all.

- `FoundationsFrame` is a header, a theme control and a capped column. There is
  no navigation between pages, and no sidebar to exclude.
- `no-hardcoded-values.test.ts` scans the whole app with an empty allowlist.
  `content/` is skipped, because a content module is prose and
  `content/scale.ts` has to be able to say that 1.25 over a 4px base gives
  6.25px.
- No link exists from the studio to the documentation, in either direction.

## The three decisions this plan is for

### 1. The route is `/studio`, not `/docs/guides`

`/docs/button` exists and is a client page. Nesting studio content under
`/docs/` would put the ship / do-not-ship boundary **inside a route segment**,
where no prefix rule can express it and every future page under `/docs/` is a
judgement call.

One top-level segment per audience instead:

| Segment        | Audience            | In the archive |
| -------------- | ------------------- | -------------- |
| `/foundations` | the client          | yes            |
| `/docs`        | the client          | yes            |
| `/studio`      | whoever operates it | **no**         |

- `/studio` — getting started: the philosophy, local-first, the nine-route tour
- `/studio/guides/*` — anchors, semantic tokens and alpha, typography, spacing
  and radius, simulation and accessibility, export and handover
- `/studio/whats-new` — the changelog

A glance at a URL says which audience a page is for, and the allowlist below is
a list of segments rather than a list of exceptions.

### 2. The allowlist is a list of what may ship, and the build fails without it

Not a prune. A prune is a subtraction somebody can forget: a guide added in six
months leaks into every client bundle, silently, and the first person to notice
is the client.

`unexpectedHandoverPaths` stops waving pages through. It takes the routes a
handover is allowed to contain, and reports anything else by name:

```
In the handover and from neither source: pages/studio/index.html
```

Which means the failure mode inverts. Today a new route ships unless somebody
remembers to strip it. After this, a new route **fails the build** unless
somebody declares it shippable — and the declaration is one line, in the same
file the guard lives in, with the reason beside it.

The same list feeds the static build. A route that may not ship is not
exported, so the pruning step the first sketch of this called for does not
exist: nothing is removed, because nothing was built.

`BLUEPRINT_STATIC` stays the one flag. It already means "this is the build that
becomes a handover", which is exactly the question being asked. A second
`DOCS_TARGET` would be a second thing to keep in step with it.

### 3. The navigation is generated from that list

There is no sidebar today, so it is built once, here, and it reads the same
list the archive guard reads.

That is the point rather than a convenience: a sidebar with its own copy of the
routes is a second definition of "what ships", and the two drift the first time
somebody adds a page and edits one of them. One list, two readers — the guard
and the nav — and a client build renders a nav with no studio section in it
because the list it was handed does not have one.

Within a build the nav has two groups, `Foundations` and `Components`, and a
third, `Studio`, that only the internal build is given.

## Prose lives in `content/`

The scanner runs over the whole app with an empty allowlist, and a guide is
made of the values it forbids: "the 25-interval grid", "a 4px base", "primary
500". The existing answer already fits — `content/` is skipped because it is
prose — so guides are content modules with thin page components over them,
exactly as `content/scale.ts` is today.

This is a constraint to design to, not a problem to solve later. A guide
written as JSX with the values inline fails the scan, and the fix at that point
is a rewrite.

## The changelog needs a real version

There is no v0.8. Every package here is `0.1.0` or `0.0.0` and private, and
`scripts/handover.ts` already stamps each archive with
`apps/playground/package.json`'s version — `0.1.0` — so a changelog headed
v0.8 contradicts the number the client is holding.

Two honest options, and this plan does not pick one:

- **Adopt a product version.** Move `apps/playground`'s version to something
  meaningful, single-source it, and have both the archive and the changelog
  read it.
- **Badge by what already exists.** Date plus workspace schema version — "22
  September 2026 · workspace v8" — which is a fact the repo can check rather
  than a number somebody maintains.

The second is cheaper and cannot go stale. The first is what a product does.
Decide before the changelog page is written, because the badge shape is the
page.

## Stages

1. **The allowlist and the guard, no pages.** `unexpectedHandoverPaths` takes
   the shippable routes and reports any page outside them. The static build
   reads the same list. Tests: a built archive containing a studio route is
   reported by name; the current six foundation pages and `/docs/button` are
   not. Nothing is written under `/studio` yet, so this stage is provably about
   the mechanism rather than about the content.

2. **The nav, from that list.** `FoundationsFrame` gains a sidebar built from
   the routes it is handed. Test: given a client list it renders no Studio
   group; given the internal list it does.

3. **`/studio` and the route tour.** Getting started — philosophy, local-first,
   the nine routes. Content module, thin page. This is the stage that proves a
   guide can be written without tripping the scanner.

4. **`/studio/guides/*`.** Six guides. Written against the studio as it is,
   not as the roadmap describes it, because the roadmaps are closed and the app
   has moved past some of them.

5. **`/studio/whats-new`.** After the version decision above, not before.

6. **The link from the studio.** A button on the workspace home in
   `apps/playground`, pointing at a configured base URL rather than a literal
   one — the two apps are separate deployments and 3001 is a local-development
   fact. Settle the variable's name and its default when this stage starts.

## Definition of done

- A handover archive built from any workspace contains `foundations/*` and
  `docs/button`, and nothing under `studio/`.
- That is held by a test which has been seen failing against an archive that
  does contain one.
- The four generated files — `blueprint.css`, `blueprint.tailwind.css`,
  `blueprint-typography.css`, `blueprint.tokens.json` — are byte for byte what
  they were before this plan. They come from the workspace and nothing here
  touches the workspace.
- The nav and the archive guard read one list.
- Every studio page passes the hardcoded-value scan with the allowlist still
  empty.
- The studio links to the guide from the workspace home.

## Not doing

- **A second application.** The guide shares the theme, the mode preference and
  the chrome with the documentation, and a third Next app to avoid one list of
  routes is a poor trade.
- **Component documentation beyond Button.** Still waiting on a product that
  argues for a component. The studio guide is about the tool, which is a
  different thing from the library, and this plan does not change that
  position.
- **Screenshots.** They go stale silently and the studio is still moving. Prose
  and token-built examples until a page is demonstrably unclear without one.
- **Versioned or translated guides.** One version, English, until somebody
  other than the author is reading them.
- **Moving the journals.** Forty-three entries are the record of why, written
  for this repository. A guide is how, written for a user. Neither becomes the
  other, and a guide that cites a journal entry is doing the right thing.

## Open

- **The version scheme**, per the section above. Blocks stage 5 only.
- **What the studio link's base URL is called and defaults to.** Blocks stage
  6 only.
- **Whether `/studio` should be reachable in the client build at all.** It is
  excluded from the archive either way. Whether the deployed documentation site
  carries it — same origin, one deployment, simply not in the bundle a client
  is handed — is a hosting question nobody has needed to answer yet.
