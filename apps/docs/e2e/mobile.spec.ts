import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

/*
 * The documentation on a phone.
 *
 * Written after the launch, because none of this had a test and all of it was
 * broken. The reading column measured 70px on a 390px screen — a contents
 * column was correctly hidden and its 240px grid track was not — and the
 * sidebar was set to `display: none` with nothing put in its place, so a
 * reader on a phone could not move between pages at all.
 *
 * Both are the kind of failure a unit test cannot see and a desktop browser
 * never shows you.
 */

const PHONE = { width: 390, height: 844 };
const ROUTE = "/foundations/colour";

/**
 * Wait until the drawer toggle is a button rather than a picture of one.
 *
 * These pages are a static export: the toggle is in the HTML immediately and
 * does nothing until React has hydrated and attached its handler. Playwright
 * will happily click it in between, and the click lands on nothing — which is
 * why the first version of this failed about half the time under four workers
 * and passed every time on its own.
 *
 * React writes its fiber and props onto a hydrated element as `__react*`
 * keys. Reaching for them is reaching into an internal, and it is the only
 * honest signal available: "this element now has a click handler" is exactly
 * the precondition, and everything else — a load state, a timeout — is a
 * guess at how long that takes.
 */
async function hydrated(page: Page, label: string): Promise<void> {
  await page.waitForFunction((name) => {
    const node = document.querySelector(`[aria-label="${name}"]`);
    return (
      node !== null &&
      Object.keys(node).some((key) => key.startsWith("__react"))
    );
  }, label);
}

test.describe("on a phone", () => {
  test.use({ viewport: PHONE });

  test("gives the reading column the screen", async ({ page }) => {
    await page.goto(ROUTE);

    const { column, viewport } = await page.evaluate(() => ({
      column: document.querySelector(".doc-column")!.getBoundingClientRect()
        .width,
      viewport: window.innerWidth,
    }));

    /* The gutter and nothing else. Anything much narrower means a track is
       still being reserved for a column that is not there. */
    expect(column, `${column}px of ${viewport}px`).toBeGreaterThan(
      viewport - 80,
    );
  });

  test("never makes the page itself scroll sideways", async ({ page }) => {
    /* A wide table must move inside its own frame. The document moving is the
       failure: it takes the header, the text and the footer with it. */
    await page.goto(ROUTE);

    const { doc, viewport } = await page.evaluate(() => ({
      doc: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    }));

    expect(doc).toBe(viewport);
  });

  test("scrolls a wide table inside its own frame", async ({ page }) => {
    /* The semantic page's contrast tables, not the colour page's. Once the
       tables ran full bleed, the colour table's 381px fitted a 390px screen
       and this test — which was pointed at it — had nothing left to scroll.
       The comment below predicted exactly that. The contrast tables are five
       columns and about 480px wider than a phone, which is the case the
       scrolling exists for. */
    await page.goto("/foundations/semantic");

    const frames = await page.evaluate(() =>
      [...document.querySelectorAll(".astryx-table-scroll-wrapper")].map(
        (node) => ({
          extra: node.scrollWidth - node.clientWidth,
          overflowX: getComputedStyle(node).overflowX,
        }),
      ),
    );
    const wide = frames.filter((frame) => frame.extra > 0);

    /* There is more table than frame — asserted, so this does not quietly
       become a test of tables that happen to fit. */
    expect(
      wide.length,
      "no table on the page is wider than a phone",
    ).toBeGreaterThan(0);
    for (const frame of wide) expect(frame.overflowX).toBe("auto");

    const { doc, viewport } = await page.evaluate(() => ({
      doc: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    }));
    expect(doc, "the page scrolled instead of the table").toBe(viewport);
  });

  test("runs every table from one edge of the screen to the other", async ({
    page,
  }) => {
    /* Full bleed: out of the gutter, flush with both edges. Every table on the
       page, not the first — they share one rule, and a second table sitting
       inside a different wrapper would be exactly how one of them got left
       behind. */
    await page.goto(ROUTE);

    const edges = await page.evaluate(() =>
      [...document.querySelectorAll(".astryx-table-scroll-wrapper")].map(
        (node) => {
          const box = node.getBoundingClientRect();
          return { left: Math.round(box.left), right: Math.round(box.right) };
        },
      ),
    );
    const viewport = await page.evaluate(() => window.innerWidth);

    expect(edges.length).toBeGreaterThan(0);
    for (const edge of edges) {
      expect(edge, "a table sits inside the gutter").toEqual({
        left: 0,
        right: viewport,
      });
    }
  });

  test("opens a drawer that reaches every section", async ({ page }) => {
    await page.goto(ROUTE);

    await expect(page.locator(".sidebar-panel")).toBeHidden();

    const toggle = page.getByRole("button", { name: "Open navigation" });
    await expect(toggle).toBeVisible();
    await hydrated(page, "Open navigation");
    await toggle.click();

    /* The whole map, not the section this page is in: the header's section
       links are the first thing to run out of room on a phone. */
    const drawer = page.getByRole("dialog");
    await expect(drawer).toBeVisible();
    /* `exact` because this repository has already been caught once by a name
       that is a prefix of another name. */
    await expect(
      drawer.getByRole("link", { name: "Colour", exact: true }),
    ).toBeVisible();
    await expect(
      drawer.getByRole("link", { name: "Button", exact: true }),
    ).toBeVisible();
  });

  test("keeps the theme control inside the header bar", async ({ page }) => {
    /* The bar is a three-column grid and the menu toggle arrived as a fourth
       child, which pushed the theme control into an implicit second row —
       20px below a bar with a fixed height, on top of the first paragraph.
       Measured at 390, 640 and 800. */
    await page.goto(ROUTE);

    const { bar, control, heading } = await page.evaluate(() => {
      const box = (selector: string) =>
        document.querySelector(selector)!.getBoundingClientRect();
      return {
        bar: box(".astryx-layout-header").bottom,
        control: box(".site-header-actions").bottom,
        heading: box("h1").top,
      };
    });

    expect(control, "the control hangs below the bar").toBeLessThanOrEqual(bar);
    expect(control, "the control reaches the first heading").toBeLessThan(
      heading,
    );
  });

  test("moves the section links into the drawer", async ({ page }) => {
    /* Three things do not fit across 390px. The links have a second home and
       the mark and the mode control do not, so the links are what goes. */
    await page.goto(ROUTE);

    await expect(page.locator(".site-sections")).toBeHidden();

    await hydrated(page, "Open navigation");
    await page.getByRole("button", { name: "Open navigation" }).click();
    const drawer = page.getByRole("dialog");
    await expect(
      drawer.getByRole("link", { name: "Colour", exact: true }),
    ).toBeVisible();
  });

  test("closes the drawer on Escape", async ({ page }) => {
    await page.goto(ROUTE);

    await hydrated(page, "Open navigation");
    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
  });
});

test.describe("above the breakpoint", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("shows the sidebar and no drawer toggle", async ({ page }) => {
    /* The other half of the rule. A toggle that survived to desktop would be a
       second navigation beside the one already there. */
    await page.goto(ROUTE);

    await expect(page.locator(".sidebar-panel")).toBeVisible();
    await expect(page.locator(".site-sections")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Open navigation" }),
    ).toBeHidden();
  });
});
