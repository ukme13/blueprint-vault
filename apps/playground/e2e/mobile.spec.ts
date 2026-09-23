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

  test("draws an opaque, lifted drawer over a dark scrim", async ({
    seededPage: page,
  }) => {
    /* From a real device: the drawer had no background of its own once it
       left AppShell's nav region — measured rgba(0, 0, 0, 0) — so the palette
       cards showed through the menu, and the backdrop used a surface token
       that is near-white in light mode, so it washed the page out rather than
       dimming it. */
    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(page.locator(".astryx-side-nav")).toHaveAttribute(
      "data-collapsed",
      "false",
    );

    const { drawer, shadow, scrim } = await page.evaluate(() => {
      /* Painted and read back rather than parsed. The drawer reports its
         colour as oklch(...) and the scrim as rgba(...), and a pixel is the
         one format every colour space ends up in. */
      const paint = (colour: string) => {
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        const context = canvas.getContext("2d")!;
        context.fillStyle = colour;
        context.fillRect(0, 0, 1, 1);
        const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data;
        return {
          alpha: alpha! / 255,
          light: (0.2126 * red! + 0.7152 * green! + 0.0722 * blue!) / 255,
        };
      };
      const nav = document.querySelector(".astryx-side-nav") as HTMLElement;
      const backdrop = document.querySelector(
        '[class*="railBackdrop"]',
      ) as HTMLElement;
      return {
        drawer: paint(getComputedStyle(nav).backgroundColor),
        shadow: getComputedStyle(nav).boxShadow,
        scrim: paint(getComputedStyle(backdrop).backgroundColor),
      };
    });

    expect(drawer.alpha, "the drawer is see-through").toBe(1);
    expect(shadow, "the drawer sits flat on the page").not.toBe("none");

    /* A dimming scrim: dark, and translucent enough to show the page is still
       there. A surface colour fails the first half in light mode. */
    expect(scrim.light, "the scrim lightens the page").toBeLessThan(0.2);
    expect(scrim.alpha, "the scrim is not there").toBeGreaterThan(0.3);
    expect(scrim.alpha, "the scrim hides the page").toBeLessThan(1);
  });

  test("gives opened toolbar panels a row instead of the edge of the screen", async ({
    seededPage: page,
  }) => {
    /* Before: one scrolling line that grew from 415px to 1019px as WCAG 2 and
       Vision opened, with Add colour scrolled to x=-253 and the controls just
       opened off the right edge. Nothing escaped the screen, which is why the
       overflow test above passed — the thing you had tapped was simply not on
       it. So this looks for controls off either edge, not for overflow. */
    await page.getByRole("button", { name: "WCAG 2", exact: true }).click();
    await page.getByRole("button", { name: "Vision", exact: true }).click();

    const { offscreen, scrolled } = await page.evaluate(() => {
      const toolbar = document.querySelector(
        '[aria-label="Palette toolbar"]',
      ) as HTMLElement;
      const viewport = window.innerWidth;
      return {
        scrolled: toolbar.scrollWidth > toolbar.clientWidth,
        offscreen: [
          ...toolbar.querySelectorAll<HTMLElement>(
            'button, [role="slider"], [aria-label="Contrast comparison"]',
          ),
        ]
          .filter((node) => {
            const box = node.getBoundingClientRect();
            return box.width > 0 && (box.right > viewport + 1 || box.left < -1);
          })
          .map((node) => (node.textContent ?? "").trim().slice(0, 20)),
      };
    });

    expect(offscreen, offscreen.join(" | ")).toEqual([]);
    expect(scrolled, "the toolbar is a scrolling line again").toBe(false);
  });

  test("keeps the studio tabs on one line", async ({ seededPage: page }) => {
    /* A guard, and an honest one: this has never failed. It passed against the
       stylesheet without \`white-space: nowrap\` at both 390px and 320px — the
       tab items already hold one line in Chromium. The nowrap stays because
       the report came from a real device, where a larger text setting or wider
       system font is exactly what breaks a label onto two lines, and this is
       the check that will say so if it ever happens here. At 320px, the
       narrowest phone still in use, because that is the harder case. */
    await page.setViewportSize({ width: 320, height: 700 });

    /* The class rather than the role: these render as buttons carrying
       Astryx's tab styling, not as role="tab", and a role query here found
       nothing and would have passed on an empty set if it had been asked
       for "at most one row". */
    const tops = await page
      .locator(".astryx-tab")
      .evaluateAll((tabs) =>
        tabs.map((tab) => Math.round(tab.getBoundingClientRect().top)),
      );

    expect(tops.length).toBeGreaterThan(1);
    expect(new Set(tops).size, `tabs at ${tops.join(", ")}`).toBe(1);
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
