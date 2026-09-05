import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 4,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
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
  webServer: {
    command: process.env.CI ? "pnpm build && pnpm start" : "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
