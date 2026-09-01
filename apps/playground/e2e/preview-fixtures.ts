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
 * Why the footer, and not the heading.
 *
 * `hasLoaded` gates only the empty-state branch here, never the markup, so the
 * page renders its whole layout — heading included — from an empty token list
 * before it knows anything about the project. Waiting on anything in that
 * layout waits for nothing.
 *
 * The footer count is the one observable that starts at a default and changes:
 * "Drawn from 0 semantic tokens" until the read lands. It is also the right
 * one rather than merely a convenient one, because the count and the CSS
 * variables are computed from the same `tokens` array in the same render — so
 * a footer reporting a layer is a DOM that already carries it.
 *
 * Matched as "not zero" rather than as an exact count. How many roles a seeded
 * workspace gets is a fact about the seed, and asserting it is a job the first
 * test in this suite already does deliberately; a fixture that repeated the
 * number would fail every spec in the file the day that seed changed.
 */
export async function openPreview(page: Page): Promise<void> {
  await seedProject(page);
  await page.goto("/preview");
  await expect(
    page.getByText(/Drawn from [1-9]\d* semantic tokens/),
  ).toBeVisible();
}
