import type { Locator, Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { openPreview } from "./preview-fixtures";
import { panel, section, heroTitle, choose } from "./preview-inspect-fixtures";

/**
 * The outline drawn on the selected element: that it keeps to what it
 * outlines, through padding, copy, type, a neighbour, a replaced node, and the
 * sticky nav.
 */

test.describe("The outline keeps to what it outlines", () => {
  test("follows a button as its padding grows", async ({ page }) => {
    await openPreview(page);
    /* The outlined one beside it, where the outline was seen to lag. */
    const button = page.getByRole("button", { name: "Open the studio" });
    await button.click();
    await choose(
      section(page, "Auto layout"),
      page,
      "Padding horizontal",
      "64px",
    );

    /* The button grew by its padding, and the outline grew with it. */
    await expect
      .poll(async () => {
        const outline = (await page
          .getByTestId("preview-selection")
          .boundingBox())!;
        const target = (await button.boundingBox())!;
        return Math.abs(outline.width - target.width);
      })
      .toBeLessThan(1.5);
    const outline = (await page
      .getByTestId("preview-selection")
      .boundingBox())!;
    const target = (await button.boundingBox())!;
    expect(outline.x).toBeCloseTo(target.x, 0);
    expect(outline.height).toBeCloseTo(target.height, 0);
  });

  test("the nav's own is drawn in the nav, and stays on it as the page scrolls", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openPreview(page);
    const nav = page.locator('[data-preview-section="shell-nav"]');
    const site = page.locator("[data-preview-ready]");

    await site.evaluate((node) => node.scrollTo(0, 600));
    await nav.click({ position: { x: 6, y: 6 } });
    await expect(
      panel(page).getByRole("heading", { name: "Nav", level: 2 }),
    ).toBeVisible();

    const align = async () => {
      const outline = (await page
        .getByTestId("preview-selection")
        .boundingBox())!;
      const box = (await nav.boundingBox())!;
      return {
        y: Math.abs(outline.y - box.y),
        h: Math.abs(outline.height - box.height),
      };
    };
    await expect.poll(async () => (await align()).y).toBeLessThan(1.5);
    expect((await align()).h).toBeLessThan(1.5);

    /* Scrolled again, it keeps to the nav. */
    await site.evaluate((node) => node.scrollTo(0, 1400));
    await expect.poll(async () => (await align()).y).toBeLessThan(1.5);

    /* Inside the nav, so the nav does not hide its own outline. */
    await expect(nav.locator('[data-testid="preview-selection"]')).toHaveCount(
      1,
    );
  });

  test("an outline of what has scrolled under the nav is under it", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openPreview(page);
    const nav = page.locator('[data-preview-section="shell-nav"]');
    const site = page.locator("[data-preview-ready]");
    const cards = page.locator('[data-preview-slot="card-feature-card"]');
    await cards.first().scrollIntoViewIfNeeded();
    await cards.first().click({ position: { x: 60, y: 6 } });
    await expect(page.getByTestId("preview-selection")).toHaveCount(3);

    /* Scrolled until the cards pass beneath the nav. */
    const top = (await cards.first().boundingBox())!.y;
    await site.evaluate((node, by) => node.scrollBy(0, by), top - 20);

    const stack = await page
      .getByTestId("preview-selection")
      .first()
      .evaluate((outline) => {
        const nav = document.querySelector(
          '[data-preview-section="shell-nav"]',
        )!;
        return {
          outlineZ: Number(getComputedStyle(outline).zIndex),
          navZ: Number(getComputedStyle(nav).zIndex),
          insideNav: nav.contains(outline),
        };
      });
    /* Not in the nav, and lower in the stack than it: the nav is over it. */
    expect(stack.insideNav).toBe(false);
    expect(stack.outlineZ).toBeLessThan(stack.navZ);
    void nav;
  });
});

test.describe("The outline follows what it outlines", () => {
  const nav = (page: Page, n: number) =>
    page.locator(`[data-preview-slot="shell-nav-${n}"]`);

  /** The outline and the element, one over the other. */
  const gap = async (page: Page, target: Locator) => {
    const outline = (await page
      .getByTestId("preview-selection")
      .boundingBox())!;
    const box = (await target.boundingBox())!;
    return {
      x: Math.abs(outline.x - box.x),
      y: Math.abs(outline.y - box.y),
      w: Math.abs(outline.width - box.width),
      h: Math.abs(outline.height - box.height),
    };
  };

  const follows = async (page: Page, target: Locator) => {
    await expect
      .poll(async () => {
        const g = await gap(page, target);
        return Math.max(g.x, g.y, g.w, g.h);
      })
      .toBeLessThan(1.5);
  };

  test("a text, as its copy is rewritten and wraps", async ({ page }) => {
    await openPreview(page);
    const link = nav(page, 1);
    await link.click();
    await follows(page, link);

    const copy = panel(page).getByRole("textbox", { name: "Copy" });
    await copy.fill("Home sweet home and then some");
    await follows(page, link);
    const wide = (await link.boundingBox())!.width;

    await copy.fill("Hi");
    await follows(page, link);
    expect((await link.boundingBox())!.width).toBeLessThan(wide);
  });

  test("a text, as its type role changes size", async ({ page }) => {
    await openPreview(page);
    const title = heroTitle(page);
    await title.click();
    await follows(page, title);
    const before = (await title.boundingBox())!;

    await panel(page).getByRole("button", { name: "Type role" }).click();
    await page.getByRole("option").filter({ hasText: /^h3/ }).first().click();
    await expect
      .poll(async () => (await title.boundingBox())!.height)
      .not.toBe(before.height);
    await follows(page, title);
  });

  test("an inline text, which no size observer is told of", async ({
    page,
  }) => {
    await openPreview(page);
    const link = nav(page, 1);
    await link.click();
    await link.evaluate((node) => {
      node.style.display = "inline";
    });
    await link.evaluate((node) => {
      node.style.fontSize = "28px";
    });
    await follows(page, link);
  });

  test("an element drawn anew in its place, as React does on a remount", async ({
    page,
  }) => {
    await openPreview(page);
    const link = nav(page, 1);
    await link.click();
    await follows(page, link);

    /* The node the outline was watching is swapped for a fresh one, bigger. */
    await link.evaluate((node) => {
      const fresh = node.cloneNode(true) as HTMLElement;
      fresh.style.fontSize = "30px";
      node.replaceWith(fresh);
    });
    await expect
      .poll(async () => (await nav(page, 1).boundingBox())!.height)
      .toBeGreaterThan(25);
    await follows(page, nav(page, 1));
  });

  test("a sticky nav keeps its outline in the very frame the page scrolls", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openPreview(page);
    const site = page.locator("[data-preview-ready]");
    const nav = page.locator('[data-preview-section="shell-nav"]');
    await nav.click({ position: { x: 6, y: 6 } });
    await expect(page.getByTestId("preview-selection")).toHaveCount(1);

    /* Scrolled and read in one go, before the page has had a frame to catch
       up in: an outline that is moved by script is a frame behind here. */
    const gaps = await site.evaluate((node) => {
      const read = () => {
        const outline = document
          .querySelector('[data-testid="preview-selection"]')!
          .getBoundingClientRect();
        const target = document
          .querySelector('[data-preview-section="shell-nav"]')!
          .getBoundingClientRect();
        return (
          Math.abs(outline.top - target.top) +
          Math.abs(outline.left - target.left)
        );
      };
      const out: number[] = [];
      for (const y of [300, 900, 1500, 0]) {
        node.scrollTo(0, y);
        out.push(read());
      }
      return out;
    });
    for (const gap of gaps) expect(gap).toBeLessThan(1.5);
  });

  test("a link in the sticky nav keeps its outline as the page scrolls", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openPreview(page);
    const site = page.locator("[data-preview-ready]");
    await page.locator('[data-preview-slot="shell-nav-1"]').click();
    await expect(page.getByTestId("preview-selection")).toHaveCount(1);
    const gaps = await site.evaluate((node) => {
      const out: number[] = [];
      for (const y of [400, 1200, 0]) {
        node.scrollTo(0, y);
        const outline = document
          .querySelector('[data-testid="preview-selection"]')!
          .getBoundingClientRect();
        const target = document
          .querySelector('[data-preview-slot="shell-nav-1"]')!
          .getBoundingClientRect();
        out.push(
          Math.abs(outline.top - target.top) +
            Math.abs(outline.left - target.left),
        );
      }
      return out;
    });
    for (const gap of gaps) expect(gap).toBeLessThan(1.5);
  });

  test("an element only pushed along by a neighbour that grew", async ({
    page,
  }) => {
    await openPreview(page);
    const link = nav(page, 3);
    await link.click();
    await follows(page, link);
    const before = (await link.boundingBox())!;

    /* The first link takes more room: this one moves and does not resize. */
    await nav(page, 1).evaluate((node) => {
      node.style.display = "inline-block";
      node.style.width = "320px";
    });
    await expect
      .poll(async () => (await link.boundingBox())!.x)
      .not.toBe(before.x);
    await follows(page, link);
  });
});
