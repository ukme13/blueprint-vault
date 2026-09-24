# 2026-09-24 — Local e2e runs against a production build

All session, playground tests failed in a full local run and passed alone: a
navigation that did not arrive, a first paint that came late, a sheet
measured mid-animation. Each was the same thing. Local runs started
`next dev`, or reused whatever answered on 3000, usually somebody's own dev
server, and dev mode compiles each route on its first request and reloads
on file changes. Under four workers that is a race the tests sometimes lose.
CI never saw it, because CI builds.

So `playwright.config.ts` now does locally what CI does: `next build`, then
`next start` on **3004**. That port clears the studio's dev server on 3000,
the docs on 3001, and 3002, which is not ours to touch. It never reuses a
server, because one left from an earlier build would test old code; a busy
port fails the run loudly instead. The five specs that flaked most passed
159 of 159 in 1m41s, build included.

Building beside a running dev server is safe: Next 16 writes dev output to
`.next/dev` and a build to `.next`. See `distDir` in next's
`dist/server/config.js`.

`E2E_DEV=1` runs against the dev server on 3000 instead.

**The trade-off.** Dev mode was the only place React StrictMode's
double-invoked effects ran under test, and one bug has lived only there: a
load/persist race in `ColourFormatProvider`, PR #42, green on CI and red on
every developer machine. No routine run exercises that now. For changes to
effects, storage, providers or persistence, run the affected specs with
`E2E_DEV=1` too before merging. A dev-mode CI job would close the gap for
good; it was left out in August for the ~2.5 minutes it adds.

## The docs suite, the same way

The docs suite already built for production, but it served on 3001, the docs'
own dev and start port, and reused whatever answered there. A docs dev server
left open answered the suite in place of the build. It now runs `next build`
and `next start --port 3005`, calling `next start` directly because the
app's start script pins 3001, and never reuses a server. `E2E_DEV=1` reuses
the docs dev server on 3001. All 50 docs tests pass in 1m13s, build included.

| Suite      | Port | Server                 | `E2E_DEV=1` |
| ---------- | ---- | ---------------------- | ----------- |
| playground | 3004 | build, then start      | dev on 3000 |
| docs       | 3005 | generate, build, start | dev on 3001 |
