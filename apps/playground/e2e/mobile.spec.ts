import { expect, test } from "./fixtures";

/*
 * The studio on a phone.
 *
 * Measured before any of this was written, on a 390px screen: the rail was a
 * 260px column at x=8, two thirds of the viewport. Scoping its width to the
 * widths that have room for a rail let Astryx do what it already wanted to —
 * move the destinations into a drawer below `md` — and uncovered the worse
 * half: the drawer had no toggle, so every studio route was unreachable.
 *
 * Both are invisible from a desktop browser and from every unit test here.
 */

const PHONE = { width: 390, height: 844 };

test.describe("on a phone", () => {
  test.use({ viewport: PHONE });

  test("does not spend the screen on the rail", async ({
    seededPage: page,
  }) => {
    const rail = page.locator(".astryx-side-nav");
    const { railWidth, viewport } = await page.evaluate(() => ({
      railWidth:
        document.querySelector(".astryx-side-nav")?.getBoundingClientRect()
          .width ?? 0,
      viewport: window.innerWidth,
    }));

    await expect(rail).toBeVisible();
    /* A bar across the top rather than a column down the side: it may be as
       wide as the screen, and it must not be as tall as one. */
    const railHeight = await rail.evaluate(
      (node) => node.getBoundingClientRect().height,
    );
    expect(railHeight, `${railHeight}px tall`).toBeLessThan(120);
    expect(railWidth).toBeLessThanOrEqual(viewport);
  });

  test("never makes the page scroll sideways", async ({ seededPage: page }) => {
    const { doc, viewport } = await page.evaluate(() => ({
      doc: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    }));

    expect(doc).toBe(viewport);
  });

  for (const route of ["/colour", "/typography", "/spacing", "/overview"]) {
    test(`keeps every control inside the screen on ${route}`, async ({
      seededPage: page,
    }) => {
      /* Not "nothing is wider than the viewport" — the shade matrix is 940px
         and is supposed to be, inside `.matrixScroller`. What must not happen
         is something escaping: wider than the screen with nothing between it
         and the body that scrolls. That is a control pushed off the edge with
         no way to reach it, which is what a five-column token row was doing
         to the largest spacing bars. */
      await page.goto(route);

      const escaped = await page.evaluate(() => {
        const viewport = window.innerWidth;
        const scrolls = (node: HTMLElement) => {
          let parent = node.parentElement;
          while (parent && parent !== document.body) {
            const overflow = getComputedStyle(parent).overflowX;
            if (overflow !== "visible") return true;
            parent = parent.parentElement;
          }
          return false;
        };
        return [...document.querySelectorAll<HTMLElement>("*")]
          .filter((node) => {
            const box = node.getBoundingClientRect();
            return box.width > 0 && box.right > viewport + 1 && !scrolls(node);
          })
          .map(
            (node) =>
              `${node.tagName}.${node.className.toString().slice(0, 30)}`,
          )
          .slice(0, 5);
      });

      expect(escaped, escaped.join(" | ")).toEqual([]);
    });
  }

  test("opens a drawer that reaches the studios", async ({
    seededPage: page,
  }) => {
    /* The failure this exists for: below the breakpoint the rail's items move
       into a drawer, and without a toggle nothing opens it. */
    const toggle = page.getByRole("button", { name: "Open navigation" });
    await expect(toggle).toBeVisible();
    await toggle.click();

    const drawer = page.getByRole("dialog");
    await expect(drawer).toBeVisible();
    for (const destination of ["Colour", "Typography", "Preview"]) {
      await expect(
        drawer.getByRole("link", { name: destination, exact: true }),
      ).toBeVisible();
    }
  });
});

test.describe("with room for a rail", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("keeps the rail a column, and offers no drawer", async ({
    seededPage: page,
  }) => {
    const width = await page
      .locator(".astryx-side-nav")
      .evaluate((node) => node.getBoundingClientRect().width);

    /* The rail's own budget, which the mobile rule must not reach. */
    expect(width).toBeGreaterThan(200);
    await expect(
      page.getByRole("button", { name: "Open navigation" }),
    ).toBeHidden();
  });
});
