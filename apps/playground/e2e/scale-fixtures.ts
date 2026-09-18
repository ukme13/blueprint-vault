import { expect, test as base, type Page } from "@playwright/test";
import { defaultProject, seedProject } from "./fixtures";

/**
 * A seeded scale studio, already loaded.
 *
 * One fixture per studio, as the palette and typography suites already do, so
 * a new spec gets the wait by remembering nothing. The wait is the reason this
 * exists: `goto` resolves on load, which is before the effect that reads
 * storage has populated the scales, the palette and the name.
 *
 * The studio now holds a loading page until that read has run, the way
 * typography does, so a region is no longer visible on defaults. The name is
 * still the wait: it is the one observable that has to match the seeded
 * project rather than merely appear.
 */

export async function openScaleStudio(page: Page): Promise<void> {
  await seedProject(page);
  await page.goto("/spacing");
  await expect(page.getByLabel("Project name")).toHaveValue(
    defaultProject().name,
  );
}

/** Show one of the scale studios. */
export async function showScaleView(
  page: Page,
  name: "Spacing" | "Radius" | "Elevation",
): Promise<void> {
  await page
    .getByRole("navigation", { name: "Blueprint workspaces" })
    .getByRole("link", { name, exact: true })
    .click();
}

export const test = base.extend<{ seededPage: Page }>({
  seededPage: async ({ page }, runTest) => {
    await openScaleStudio(page);
    await runTest(page);
  },
});

export { expect };
