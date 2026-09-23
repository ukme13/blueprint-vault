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

  test("keeps the toolbar one line of chips that swipes", async ({
    seededPage: page,
  }) => {
    /* WCAG 2 and Vision used to grow their options into this line, which
       either pushed them off a scrolling strip or wrapped it onto three rows.
       On a phone the options are in a sheet, so tapping a chip must leave the
       line as it was: one row, nothing inline. */
    await page.getByRole("button", { name: "WCAG 2", exact: true }).click();
    await page.getByRole("button", { name: "Apply" }).click();

    const toolbar = page.getByLabel("Palette toolbar");
    const tops = await toolbar.locator("button").evaluateAll((buttons) =>
      buttons
        /* The sheets are rendered beside their chips and stay mounted,
             parked below the screen, when shut. */
        .filter((button) => !button.closest("dialog"))
        .filter((button) => button.getBoundingClientRect().width > 0)
        .map((button) => Math.round(button.getBoundingClientRect().top)),
    );
    expect(tops.length).toBeGreaterThan(2);
    /* Within a couple of pixels rather than equal: the Vision chip sits in a
       group with a border of its own. A second row would be 30px down. */
    expect(
      Math.max(...tops) - Math.min(...tops),
      `chips at ${tops.join(", ")}`,
    ).toBeLessThanOrEqual(4);
    await expect(
      toolbar.getByLabel("Contrast comparison", { exact: true }),
    ).toBeHidden();
    expect(
      await toolbar.evaluate((node) => getComputedStyle(node).overflowX),
    ).toBe("auto");
  });

  test("sets WCAG checks in a sheet, and fills the chip once they are on", async ({
    seededPage: page,
  }) => {
    const chip = page.getByRole("button", { name: "WCAG 2", exact: true });
    await chip.click();

    const sheet = page.getByRole("dialog", { name: "WCAG contrast" });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole("button", { name: "Reset" })).toBeVisible();
    await expect(sheet.getByRole("button", { name: "Cancel" })).toBeVisible();

    const apply = sheet.getByRole("button", { name: "Apply" });
    const primary = await apply.evaluate(
      (node) => getComputedStyle(node).backgroundColor,
    );
    await apply.click();

    await expect(sheet).toBeHidden();
    await expect(chip).toHaveAttribute("aria-pressed", "true");
    /* Filled with the colour the Apply button is, not the desktop's tint.
       Polled: the button eases its background, and a read mid-transition is
       a mix of the two. */
    await expect
      .poll(() =>
        chip.evaluate((node) => getComputedStyle(node).backgroundColor),
      )
      .toBe(primary);
  });

  test("lays the sheet out inside itself", async ({ seededPage: page }) => {
    /* From a real device: a grey scrollbar under the footer and a washed-out
       title. The sheet sits inside the toolbar in the DOM and inherited its
       `nowrap`, so the switch description ran past the edge; and the title
       started under the grab handle, which Astryx floats over the first 24px
       with a fade. */
    await page.getByRole("button", { name: "Vision", exact: true }).click();
    const sheet = page.getByRole("dialog", { name: "Vision simulation" });
    await expect(sheet).toBeVisible();

    const layout = await sheet.evaluate((dialog) => {
      const panel = dialog.querySelector(".astryx-bottom-sheet") as HTMLElement;
      const heading = dialog.querySelector("h2") as HTMLElement;
      return {
        scrolls: [...panel.querySelectorAll<HTMLElement>("*")]
          .filter((node) => node.scrollWidth > node.clientWidth + 1)
          .filter((node) => getComputedStyle(node).overflowX !== "visible")
          .map((node) => `${node.scrollWidth} in ${node.clientWidth}`),
        headingTop:
          heading.getBoundingClientRect().top -
          panel.getBoundingClientRect().top,
      };
    });

    expect(layout.scrolls, layout.scrolls.join(" | ")).toEqual([]);
    expect(layout.headingTop).toBeGreaterThanOrEqual(24);
  });

  test("discards the Vision draft on Cancel and on the scrim", async ({
    seededPage: page,
  }) => {
    const chip = page.getByRole("button", { name: "Vision", exact: true });
    const sheet = page.getByRole("dialog", { name: "Vision simulation" });

    /* The sheet opens with simulation on in the draft; nothing is committed
       until Apply. */
    await chip.click();
    await expect(sheet.getByRole("switch")).toBeChecked();
    await sheet.getByRole("button", { name: "Cancel" }).click();
    await expect(sheet).toBeHidden();
    await expect(chip).toHaveAttribute("aria-pressed", "false");

    /* The scrim covers everything above the sheet; the top of the screen is
       where a thumb dismisses it. */
    await chip.click();
    await expect(sheet).toBeVisible();
    await page.mouse.click(195, 40);
    await expect(sheet).toBeHidden();
    await expect(chip).toHaveAttribute("aria-pressed", "false");

    await chip.click();
    await sheet.getByRole("button", { name: "Apply" }).click();
    await expect(chip).toHaveAttribute("aria-pressed", "true");

    /* Reset is a draft change like any other: the defaults, then Apply. */
    await chip.click();
    await sheet.getByRole("button", { name: "Reset" }).click();
    await expect(sheet.getByRole("switch")).not.toBeChecked();
    await sheet.getByRole("button", { name: "Apply" }).click();
    await expect(chip).toHaveAttribute("aria-pressed", "false");
  });

  test("gives the top bar room above the menu button and Export", async ({
    seededPage: page,
  }) => {
    const trigger = await page
      .getByRole("button", { name: "Open navigation" })
      .boundingBox();
    const exportButton = await page
      .getByRole("button", { name: "Export palette" })
      .boundingBox();

    expect(trigger!.y).toBeGreaterThanOrEqual(12);
    expect(Math.abs(exportButton!.y - trigger!.y)).toBeLessThanOrEqual(1);
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

    test(`leaves nothing under the menu button on ${route}`, async ({
      seededPage: page,
    }) => {
      /* The button is fixed over the studio's top bar. Overview's heading and
         the Scale tab both sat under it until their bars made room. */
      await page.goto(route);

      const covered = await page
        .getByRole("button", { name: "Open navigation" })
        .evaluate((trigger) => {
          const t = trigger.getBoundingClientRect();
          return [...document.querySelectorAll<HTMLElement>("body *")]
            .filter(
              (node) => !trigger.contains(node) && !node.contains(trigger),
            )
            .filter((node) => {
              const hasText = [...node.childNodes].some(
                (child) =>
                  child.nodeType === Node.TEXT_NODE &&
                  (child.textContent ?? "").trim().length > 0,
              );
              const box = node.getBoundingClientRect();
              return (
                hasText &&
                box.width > 0 &&
                box.left < t.right &&
                box.right > t.left &&
                box.top < t.bottom &&
                box.bottom > t.top
              );
            })
            .map((node) => (node.textContent ?? "").trim().slice(0, 20));
        });

      expect(covered, covered.join(" | ")).toEqual([]);
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
