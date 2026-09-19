import { expect, type Page } from "@playwright/test";
import { seedProject } from "./fixtures";

/**
 * A seeded preview page, with its semantic layer already applied.
 *
 * One fixture per area, as the palette, typography and scale suites already
 * do, so a new spec gets the wait by remembering nothing. The wait is the
 * reason this exists: `goto` resolves on load, which is before the effect that
 * reads storage has populated the project — and under StrictMode that effect
 * runs twice, so the window is wider in dev than in production. CI builds for
 * production, so it cannot catch what this protects against.
 *
 * Acting inside that window does not look like a race. Every colour on this
 * page comes from a semantic token, and before the read lands there are no
 * tokens and so no variables: the primary action measures
 * `rgba(0, 0, 0, 0)` — a real answer from a real element, just the wrong one.
 * A test that took its baseline there passed the assertion that the
 * simulation changed the colour, then failed the one that turning it off
 * brought the colour back, because transparent is not what it comes back to.
 * That reads as a bug in the toggle.
 */

/**
 * Why the ready flag, and not the heading.
 *
 * `hasLoaded` now holds the canvas back until the read finishes, so the
 * heading is no longer a false ready signal from an empty token list. The
 * attribute is still the one observable tied to the tokens that fill the CSS
 * variables: a canvas that already carries it is a DOM that already carries
 * the layer.
 */
export async function openPreview(page: Page): Promise<void> {
  await seedProject(page);
  await page.goto("/preview");
  await expect(page.locator("[data-preview-ready]")).toBeVisible();
}
