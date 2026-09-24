import { defineConfig, devices } from "@playwright/test";

/**
 * The documentation's own Playwright project.
 *
 * Stage 6 of the foundations plan. The pages claim to be templates over a
 * workspace, and the unit tests in `components/` prove that by rendering one
 * twice with a value changed — which is a claim about the components. This is
 * the claim about the site: that a built page, served, shows what the
 * reference workspace says, in whichever mode the reader is in.
 *
 * Its own port, 3005: not the studio's 3000 or its suite's 3004, and not
 * 3001, where the docs' own `dev` and `start` run. It used to be 3001 with
 * the running server reused, so a docs dev server left open answered the
 * suite in place of the build, and tested whatever it had compiled rather
 * than what `next build` renders. A server is never reused now; a busy port
 * fails the run rather than testing the wrong thing. 3002 is not ours.
 *
 * `E2E_DEV=1` runs against the docs dev server on 3001 instead, reusing it,
 * as the studio's suite does on 3000.
 *
 * See docs/roadmap/foundations-handover.md.
 */
const useDevServer = !process.env.CI && process.env.E2E_DEV === "1";
const port = useDevServer ? 3001 : 3005;
const docsOrigin = `http://localhost:${port}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 4,
  reporter: "list",
  use: {
    baseURL: docsOrigin,
    trace: "on-first-retry",
    /*
     * The same setting, and the same reasoning, as the playground's config.
     * Astryx animates and Playwright's actionability check waits for a box to
     * hold still; reduced motion is a mode real people browse in, and these
     * tests assert what a page contains rather than how it arrives.
     *
     * Through `contextOptions` rather than a top-level `reducedMotion` key.
     * 1.62's `PlaywrightTestOptions` does not carry that key: written at the
     * top level it type-errors, and at runtime it is simply ignored — which is
     * the worse half, and the fault the studio's suite shipped once already.
     */
    contextOptions: { reducedMotion: "reduce" },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    /*
     * A production server unless `E2E_DEV=1` asks otherwise. These pages are
     * static and the thing being checked is what `next build` renders from
     * the workspace — dev-mode output is a different artefact, and the export
     * the handover ships is built from this one.
     */
    command: useDevServer
      ? "pnpm dev"
      : /* next start directly: the app's start script pins --port 3001. */
        `pnpm build && pnpm exec next start --port ${port}`,
    url: docsOrigin,
    reuseExistingServer: useDevServer,
    timeout: 180_000,
  },
});
