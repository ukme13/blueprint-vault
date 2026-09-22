# 2026-09-23 — The link, and where a pure function lives

Stage 6, the last of the studio guide plan: a way from the studio to the guide
written about it.

## A button, an environment variable, and a new tab

"Studio guide" sits on the workspace home beside "Import project", as a text
button with an `href` — the shared `Button` already renders as a link when
given one, so this needed no new component.

`NEXT_PUBLIC_DOCS_URL`, falling back to `http://localhost:3001`. The two
applications are separate deployments, so a literal URL would be wrong in one
environment or the other; the fallback is the port `pnpm dev` serves the
documentation on, which is a local fact rather than a default anybody ships.
`NEXT_PUBLIC_` because the link renders in the browser and the value is a
public URL — inlined by design, with nothing in it to keep.

It opens in a new tab. A guide is a reference somebody comes back from, and
losing the studio to read about the studio is the wrong way round.

## The test told me where the function belonged

The joining — base plus path — started in `apps/playground/lib`. Writing a test
for it was the problem: the playground has no unit tests at all, and the first
attempt reached across the workspace from `packages/ui` with a relative path,
which this repository forbids for good reasons.

That difficulty is the answer rather than an obstacle to route around. The rule
says it outright: if logic is hard to unit test, it is usually sitting in the
wrong workspace. So `docsUrl(path, base)` is in `packages/ui` with four tests,
and what stays in the application is reading the environment — the part a test
would learn nothing from.

The four are worth having for a function this small, because the ways it goes
wrong are invisible in development: a base with a trailing slash gives a double
slash, and a base that is more than a host loses its path. Neither happens
locally, where the base is `http://localhost:3001` and nobody has configured
anything.

## One flaky failure, reported rather than chased

`workspace-home.spec.ts` failed once on "clicking another card opens that name
on the rail", and passed on its own. It is about clicking a project card and
reading the rail; this change added a link to the header above it. Unrelated,
and left alone.

## Checks

- `pnpm -r test`: 1172 in `packages/ui`, 51 in `apps/docs`.
- The one Playwright spec that covers the page this touched: 14 of 15, with the
  flake above.
- Lint at `--max-warnings 0`, types clean across all three workspaces, Prettier
  clean. `NEXT_PUBLIC_DOCS_URL` declared in `turbo.json` beside the others.
