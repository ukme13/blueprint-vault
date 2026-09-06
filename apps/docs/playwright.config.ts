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
 * Its own port, 3001, which is what the app's `dev` and `start` already use.
 * A suite that shared 3000 with the studio would pass or fail depending on
 * which app somebody happened to be running.
 *
 * See docs/roadmap/foundations-handover.md.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 4,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3001",
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
     * A production server, not `next dev`. These pages are static and the
     * thing being checked is what `next build` renders from the workspace —
     * dev-mode output is a different artefact, and the export the handover
     * ships is built from this one.
     */
    command: "pnpm build && pnpm start",
    url: "http://localhost:3001",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
