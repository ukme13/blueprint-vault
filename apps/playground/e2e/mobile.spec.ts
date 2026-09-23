import { expect, test } from "./fixtures";

/*
 * The studio on a phone.
 *
 * Rewritten after a real device said what an emulated one had not. The rail
 * was animating its width from 52px to 260px against a 390px screen, which
 * left the studio 115px and reflowed all of it on every expand — a spring,
 * not a transition. Nothing about that is fixable by easing it better.
 *
 * So below 768px the rail leaves the flow: fixed, off-canvas, slid in over a
 * backdrop. The assertions below are the shape of that, and the one that
 * matters most is that the content does not move.
 */

const PHONE = { width: 390, height: 844 };

test.describe("on a phone", () => {
  test.use({ viewport: PHONE });

  test("starts with the drawer shut, whatever the stored preference", async ({
    seededPage: page,
  }) => {
    /* The stored preference is about how wide a rail should be beside the
       content. Below the breakpoint the rail is over the content, and
       "expanded" there is a drawer covering the studio before anybody asked. */
    const rail = page.locator(".astryx-side-nav");

    await expect(rail).toHaveAttribute("data-collapsed", "true");
    const left = await rail.evaluate(
      (node) => node.getBoundingClientRect().left,
    );
    expect(left, `${left}px from the left edge`).toBeLessThan(0);
  });

  test("opens over the page without moving it", async ({
    seededPage: page,
  }) => {
    /* The whole point. The canvas is measured before and after, and the rail
       goes from off-canvas to flush with the edge in between. */
    const canvas = page.locator('[class*="canvas"]').first();
    const width = () =>
      canvas.evaluate((node) => node.getBoundingClientRect().width);

    const before = await width();
    await page.getByRole("button", { name: "Open navigation" }).click();

    const rail = page.locator(".astryx-side-nav");
    await expect(rail).toHaveAttribute("data-collapsed", "false");
    await expect
      .poll(
        async () =>
          rail.evaluate((node) =>
            Math.round(node.getBoundingClientRect().left),
          ),
        { timeout: 3000 },
      )
      .toBe(0);

    expect(await width(), "the studio moved under the drawer").toBe(before);
  });

  test("closes on the backdrop", async ({ seededPage: page }) => {
    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(page.locator(".astryx-side-nav")).toHaveAttribute(
      "data-collapsed",
      "false",
    );

    /* Tapped to the right of the drawer, which is where a thumb goes. The
       backdrop covers the whole viewport and its centre is underneath the
       drawer, so clicking the element itself would hit the drawer instead. */
    await page.mouse.click(340, 500);

    await expect(page.locator(".astryx-side-nav")).toHaveAttribute(
      "data-collapsed",
      "true",
    );
  });

  test("swipes the shade grid instead of breaking the page", async ({
    seededPage: page,
  }) => {
    const scroller = page.locator('[class*="matrixScroller"]').first();
    const { width, scrollWidth, overflowX } = await scroller.evaluate(
      (node) => ({
        width: node.getBoundingClientRect().width,
        scrollWidth: node.scrollWidth,
        overflowX: getComputedStyle(node).overflowX,
      }),
    );

    expect(overflowX).toBe("auto");
    /* There is more grid than frame, which is the case the scrolling is for. */
    expect(scrollWidth).toBeGreaterThan(width);

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
      /* Not "nothing is wider than the viewport" — the shade grid is 940px and
         is supposed to be. What must not happen is something escaping: wider
         than the screen with nothing between it and the body that scrolls. */
      await page.goto(route);

      const escaped = await page.evaluate(() => {
        const viewport = window.innerWidth;
        const scrolls = (node: HTMLElement) => {
          let parent = node.parentElement;
          while (parent && parent !== document.body) {
            if (getComputedStyle(parent).overflowX !== "visible") return true;
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
});

test.describe("with room for a rail", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("keeps the rail a column, and offers no drawer", async ({
    seededPage: page,
  }) => {
    const rail = page.locator(".astryx-side-nav");
    const { width, position } = await rail.evaluate((node) => ({
      width: node.getBoundingClientRect().width,
      position: getComputedStyle(node).position,
    }));

    /* In the flow, at the rail's own budget. The drawer rules must not reach
       a width that has room for a column. */
    expect(position).not.toBe("fixed");
    expect(width).toBeGreaterThan(200);
    await expect(
      page.getByRole("button", { name: "Open navigation" }),
    ).toBeHidden();
  });
});
