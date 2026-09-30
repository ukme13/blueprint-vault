import {
  expect,
  test as base,
  type Locator,
  type Page,
} from "@playwright/test";
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

/**
 * Open the Spacing studio's Steps panel, when it is not open already.
 *
 * It starts folded, so a test that reads or toggles a step opens it first. Safe
 * to call twice: an open panel is left as it is.
 */
export async function openSpacingSteps(page: Page): Promise<void> {
  const trigger = page
    .getByRole("region", { name: "Generated spacing steps" })
    .getByRole("button", { name: "Steps", exact: true });
  if ((await trigger.getAttribute("aria-expanded")) === "false") {
    await trigger.click();
  }
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
}

export const test = base.extend<{ seededPage: Page }>({
  seededPage: async ({ page }, runTest) => {
    await openScaleStudio(page);
    await runTest(page);
  },
});

export { expect };

/**
 * The spacing preview's size tags, checked against its content: how many
 * there are, which ones touch a heading, paragraph, button, field, list
 * item, the logo or the note, and which run off the screen. A tag belongs
 * off the space it names, where nothing is written.
 */
export function spacingTagReport(
  preview: Locator,
): Promise<{ tags: number; hits: string[]; offScreen: string[] }> {
  return preview.evaluate((figure) => {
    const tags = [...figure.querySelectorAll("[data-spacing-tag]")];
    const content = [
      ...figure.querySelectorAll(
        "h3, p, button, li, [class*=sampleField], [class*=sampleLogo], [class*=sampleNote]",
      ),
    ];
    const hits: string[] = [];
    const offScreen: string[] = [];
    for (const tag of tags) {
      const a = tag.getBoundingClientRect();
      if (a.left < 0 || a.right > window.innerWidth) {
        offScreen.push(tag.textContent ?? "");
      }
      for (const node of content) {
        const b = node.getBoundingClientRect();
        const overlaps =
          a.left < b.right - 0.5 &&
          b.left < a.right - 0.5 &&
          a.top < b.bottom - 0.5 &&
          b.top < a.bottom - 0.5;
        if (overlaps) {
          hits.push(`${tag.textContent} on ${node.textContent?.slice(0, 20)}`);
        }
      }
    }
    return { tags: tags.length, hits, offScreen };
  });
}

/** Step values cut off, or running past their row: none should be. */
export function clippedValues(steps: Locator): Promise<string[]> {
  return steps.evaluate((section) =>
    [...section.querySelectorAll("li")]
      .filter((row) => {
        const value = row.querySelector("[data-spacing-value]") as HTMLElement;
        return (
          value.scrollWidth > value.clientWidth + 0.5 ||
          value.getBoundingClientRect().right >
            row.getBoundingClientRect().right + 0.5
        );
      })
      .map((row) => row.textContent ?? ""),
  );
}
