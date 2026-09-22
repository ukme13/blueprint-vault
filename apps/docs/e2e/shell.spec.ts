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

  test("centres the mark in the header bar", async ({ page }) => {
    /* The divider is drawn on the bar, so anything taller than the bar pushes
       its own bottom edge under the line. Astryx pads the header's wrapper
       16px above and below, which with the mode control inside measured 60 in
       a bar declared at 56 — four over, and the line cut across the mark. */
    await page.goto(ROUTE);

    const { above, below } = await page.evaluate(() => {
      const bar = document
        .querySelector(".astryx-layout-header")!
        .getBoundingClientRect();
      const mark = document
        .querySelector(".site-mark-wordmark")!
        .getBoundingClientRect();
      return { above: mark.top - bar.top, below: bar.bottom - mark.bottom };
    });

    /* Within two pixels: the bar's hairline border counts in its height, so
       perfectly centred content sits a fraction high. */
    expect(
      Math.abs(above - below),
      `${above} above, ${below} below`,
    ).toBeLessThan(2);
  });

  test("rules the footer across more than the reading column", async ({
    page,
  }) => {
    /* The reading column is capped so a line of prose stays readable. A footer
       is a rule across the page, and a capped one stops short of the width it
       is ruling off — so it sits outside the column and spans the region. */
    await page.setViewportSize({ width: 1800, height: 900 });
    await page.goto(ROUTE);

    const { column, footer } = await page.evaluate(() => ({
      column: document.querySelector(".doc-column")!.getBoundingClientRect()
        .width,
      footer: document.querySelector(".site-footer")!.getBoundingClientRect()
        .width,
    }));

    expect(footer).toBeGreaterThan(column);
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
