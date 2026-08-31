import { expect, test as base, type Page } from "@playwright/test";
import { defaultProject, seedProject } from "./fixtures";

/**
 * A seeded scale studio, already loaded.
 *
 * One fixture per studio, as the palette and typography suites already do, so
 * a new spec gets the wait by remembering nothing. The wait is the reason this
 * exists: `goto` resolves on load, which is before the effect that reads
 * storage has populated the scales, the palette and the name — and under
 * StrictMode that effect runs twice, so the window is wider in dev than in
 * production.
 *
 * Acting inside it fails in ways that look nothing like a race. `fill` on the
 * name appended to the seeded value instead of replacing it, because the
 * re-read landed between the clear and the insert; the elevation shadow came
 * out a shade off because the palette it is drawn from had arrived for one
 * swatch and not the other. Neither reproduced on CI, which builds for
 * production and has no StrictMode to double the effect.
 */

/**
 * Why the name, and not a region.
 *
 * The typography fixture waits for a panel to appear, because that studio
 * renders a placeholder until its read has run. This one renders every
 * region immediately from `defaultSpacingScale()` and friends — `hasLoaded`
 * gates the writes, never the markup — so a region is visible before the
 * studio knows anything about the project. The name is the one observable
 * that starts at a default and changes: `"Workspace"` until the read lands,
 * the project's name afterwards.
 */
export async function openScaleStudio(page: Page): Promise<void> {
  await seedProject(page);
  await page.goto("/scale");
  await expect(page.getByLabel("Project name")).toHaveValue(
    defaultProject().name,
  );
}

export const test = base.extend<{ seededPage: Page }>({
  seededPage: async ({ page }, runTest) => {
    await openScaleStudio(page);
    await runTest(page);
  },
});

export { expect };
