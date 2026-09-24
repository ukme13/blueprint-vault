import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

/*
 * The logo does not move between Home and a workspace.
 *
 * Home draws the wordmark in a top bar; a studio draws the monogram in the
 * rail. They are different elements in different regions, which is exactly
 * why nothing kept them in the same place: Home's sat 16px further right and
 * 10px further down, so walking from the project library into a studio made
 * the brand jump. Measured and compared rather than asserted against fixed
 * numbers, so a change to either side that moves both still passes and a
 * change to one fails.
 *
 * On a phone the rail is a drawer, so the workspace's logo is measured with the
 * drawer open — that is where a reader sees it.
 */

/* The monogram leads both drawings: Home's wordmark starts with it, and the
   rail draws it on its own. Matching their left edges matches the mark. */
async function logoBox(page: Page, viewBox: string) {
  return page.evaluate((box) => {
    const mark = document.querySelector(`svg[viewBox="${box}"]`);
    if (!mark) throw new Error(`no logo drawn with viewBox ${box}`);
    const rect = mark.getBoundingClientRect();
    return { x: rect.left, y: rect.top, height: rect.height };
  }, viewBox);
}

for (const [label, viewport] of [
  ["on a desktop", { width: 1280, height: 900 }],
  ["on a phone", { width: 390, height: 844 }],
] as const) {
  test.describe(label, () => {
    test.use({ viewport });

    test("puts Home's logo where the workspace puts it", async ({
      seededPage: page,
    }) => {
      await page.goto("/");
      const home = await logoBox(page, "0 0 541 174");

      await page.goto("/colour");
      if (viewport.width <= 768) {
        await page.getByRole("button", { name: "Open navigation" }).click();
        /* Once the drawer has finished sliding, not while it is on its way. */
        await expect
          .poll(
            async () =>
              page
                .locator(".astryx-side-nav")
                .evaluate((node) =>
                  Math.round(node.getBoundingClientRect().left),
                ),
            { timeout: 3000 },
          )
          .toBe(0);
      }
      const workspace = await logoBox(page, "0 0 104 174");

      /* Within half a pixel: the two drawings round differently at the edge. */
      expect(Math.abs(home.x - workspace.x), "left edge").toBeLessThan(0.5);
      expect(Math.abs(home.y - workspace.y), "top edge").toBeLessThan(0.5);
      expect(Math.abs(home.height - workspace.height), "size").toBeLessThan(
        0.5,
      );
    });
  });
}
