import { expect, test } from "./fixtures";

/*
 * The frame, while a reader scrolls.
 *
 * Reported from a screenshot rather than found by a test, which is why these
 * exist: the header sat in the page flow, so the whole document scrolled under
 * it and the content came up through it. The cause was one line — `height:
 * fill` on a Layout whose parent had only a `min-height`, which resolves to
 * nothing — and no assertion anywhere would have noticed.
 */

const ROUTE = "/foundations/spacing";

import type { Locator } from "@playwright/test";

async function boxOf(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("element has no box");
  return box;
}

/**
 * Stayed where it was, to within a pixel.
 *
 * Not exact equality. A sticky element settles on a subpixel — 55.984 against
 * 56 — because the browser resolves its offset against a fractional scroll
 * position. Asserting the exact number failed while the column was behaving
 * perfectly, and the thing being tested is "did not scroll away", not "is
 * identical to fifteen decimal places".
 */
function heldStill(after: number, before: number, what: string) {
  expect(
    Math.abs(after - before),
    `${what} moved by ${after - before}px`,
  ).toBeLessThan(1);
}

test.describe("the shell", () => {
  test("keeps the header in place while the content scrolls", async ({
    page,
  }) => {
    await page.goto(ROUTE);

    const header = page.locator(".site-header");
    const before = await boxOf(header);

    const sections = page.locator(".doc-column section[id]");
    await sections.last().scrollIntoViewIfNeeded();
    /* Proof the scroll actually happened, so a header that "did not move"
       cannot pass on a page that did not move either. */
    await expect(sections.last()).toBeInViewport();

    const after = await boxOf(header);
    heldStill(after.y, before.y, "the header");
  });

  test("scrolls each nav column on its own", async ({ page }) => {
    await page.goto(ROUTE);

    for (const selector of [".sidebar-panel", ".toc-panel"]) {
      const scrolls = await page
        .locator(selector)
        .evaluate((node) => getComputedStyle(node).overflowY);
      expect(scrolls, selector).toBe("auto");
    }
  });

  test("holds both nav columns still while the content scrolls", async ({
    page,
  }) => {
    /* What "sticky" means to a reader: the two columns are where they were
       when the middle one has moved. */
    await page.goto(ROUTE);

    const sidebar = page.locator(".sidebar-panel");
    const toc = page.locator(".toc-panel");
    const before = [await boxOf(sidebar), await boxOf(toc)];

    await page
      .locator(".doc-column section[id]")
      .last()
      .scrollIntoViewIfNeeded();

    const after = [await boxOf(sidebar), await boxOf(toc)];
    heldStill(after[0]!.y, before[0]!.y, "the sidebar");
    heldStill(after[1]!.y, before[1]!.y, "the on-page nav");
  });
});
