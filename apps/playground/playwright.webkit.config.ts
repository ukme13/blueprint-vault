import { defineConfig, devices } from "@playwright/test";
import base from "./playwright.config";

/**
 * The specs only WebKit can fail, on an iPhone: `*.webkit.spec.ts`. The
 * Chromium project ignores them. Run with `pnpm e2e:webkit`, after
 * `pnpm exec playwright install webkit`.
 */
export default defineConfig({
  ...base,
  testMatch: /\.webkit\.spec\.ts$/,
  projects: [{ name: "webkit", use: { ...devices["iPhone 14"] } }],
});
