import { defineConfig, devices } from "@playwright/test";

/*
 * A production build, locally as in CI.
 *
 * Local runs used to start `next dev`, or reuse whatever already answered on
 * 3000, which was usually somebody's own dev server. Dev mode compiles each
 * route on first request and reloads on file changes, and under four workers
 * that surfaced as tests failing on a navigation or a first paint and passing
 * when run alone. CI never saw it, because CI builds. So a local run builds
 * too, and a red local suite means the same thing a red CI run does.
 *
 * Its own port, 3004, so it never lands on a dev server: 3000 is the studio's
 * `dev`, 3001 the docs, and 3002 is not ours to touch. A server is never
 * reused, because one left running from an earlier build would test old code;
 * if the port is taken, the run says so rather than testing the wrong thing.
 *
 * `E2E_DEV=1` runs against the dev server on 3000 instead, reusing it, for a
 * quick loop on one spec. Expect the flakiness that comes with it.
 *
 * The cost: no routine run is in dev mode now, so nothing routinely catches a
 * bug that only React StrictMode's double-invoked effects expose. One did
 * once — a load/persist race in ColourFormatProvider, PR #42 — green on CI and
 * red on every dev machine. Before merging anything that touches effects,
 * storage or providers, run the affected specs with `E2E_DEV=1` as well.
 */
const useDevServer = !process.env.CI && process.env.E2E_DEV === "1";
const port = useDevServer ? 3000 : 3004;
const playgroundOrigin =
  process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${port}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 4,
  reporter: "list",
  use: {
    baseURL: playgroundOrigin,
    trace: "on-first-retry",
    /*
     * Tests run with motion reduced, which the components honour.
     *
     * Not a way of making the suite faster or of papering over a slow page.
     * Measured on the export dialog: with motion on, the format buttons are
     * still travelling 366ms after the dialog opens — about 23px sideways —
     * and Playwright is told to click one of them the moment it appears. Its
     * actionability check waits for the box to hold still for two frames, and
     * under four workers on a loaded machine that wait was occasionally never
     * satisfied, which surfaced as "element is not stable" and a thirty-second
     * timeout on a click that normally takes milliseconds. Astryx also turns
     * off `scroll-behavior: smooth` under this setting, which matters for the
     * same reason: Playwright scrolls an element into view before clicking it,
     * and a smooth scroll means the element is moving because it was about to
     * be clicked.
     *
     * With the setting on, the same button is at its final position on the
     * first frame and never moves. The tests here assert what a page contains
     * and what it does, never how it arrives, so there is nothing left for the
     * animation to prove — and reduced motion is a mode real people browse in,
     * so this exercises a supported path rather than an artificial one.
     *
     * Through `contextOptions` rather than a top-level `reducedMotion` key.
     * Playwright's documentation lists reduced motion among the options a test
     * may override, and 1.62's `PlaywrightTestOptions` does not carry it —
     * only `colorScheme` of that group is there. Written at the top level it
     * is not a valid key: it type-errors, and at runtime it is simply ignored,
     * which is the worse half. `browser-emulation.spec.ts` asserts the media
     * query, so a version that moves this cannot leave it silently off again.
     */
    contextOptions: { reducedMotion: "reduce" },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: useDevServer
    ? {
        command: "pnpm dev",
        url: playgroundOrigin,
        reuseExistingServer: true,
        timeout: 120_000,
      }
    : {
        command: `pnpm build && pnpm start --port ${port}`,
        url: playgroundOrigin,
        reuseExistingServer: false,
        /* A cold `next build` takes a minute or two on its own. */
        timeout: 300_000,
      },
});
