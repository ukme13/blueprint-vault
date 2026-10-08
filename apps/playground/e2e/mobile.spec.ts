import type { Locator, Page } from "@playwright/test";
import {
  PROJECT_STORAGE_KEY,
  createWorkspaceFromHome,
  defaultProject,
  expect,
  test,
} from "./fixtures";
import {
  clippedValues,
  openSpacingSteps,
  spacingTagReport,
} from "./scale-fixtures";
import { openPreview } from "./preview-fixtures";
import {
  TYPOGRAPHY_STORAGE_KEY,
  defaultTypographyProject,
  seedTypographyProject,
} from "./typography-fixtures";

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

/**
 * The space between the last thing on a page and the bottom of the view,
 * scrolled all the way down: the innermost elements only, so a wrapper
 * stretched to the bottom does not count as content.
 */
async function roomAtTheBottom(page: Page): Promise<number> {
  await page.waitForLoadState("networkidle");
  return page.evaluate(() => {
    const doc = document.scrollingElement as HTMLElement;
    const scrollers = [doc, ...document.querySelectorAll("*")].filter(
      (node): node is HTMLElement =>
        node.scrollHeight > node.clientHeight + 1 &&
        (node === doc || /auto|scroll/.test(getComputedStyle(node).overflowY)),
    );
    const main = scrollers.sort(
      (a, b) =>
        b.scrollHeight - b.clientHeight - (a.scrollHeight - a.clientHeight),
    )[0]!;
    main.scrollTop = main.scrollHeight;
    const bottom =
      main === doc ? innerHeight : main.getBoundingClientRect().bottom;
    let last = 0;
    for (const node of (main === doc ? document.body : main).querySelectorAll(
      "*",
    )) {
      const box = node.getBoundingClientRect();
      const css = getComputedStyle(node);
      if (!box.height || node.children.length > 0) continue;
      if (node.closest(".sr-only") || css.position === "fixed") continue;
      last = Math.max(last, box.bottom);
    }
    return Math.round(bottom - last);
  });
}

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
    /* No Cancel and no close button: the scrim, a swipe and Escape are how a
       phone's sheet is left. */
    await expect(
      sheet.getByRole("button", { name: /^(Cancel|Close)$/ }),
    ).toHaveCount(0);

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

  test("draws the segmented control with even padding, and labelled", async ({
    seededPage: page,
  }) => {
    /* From a device: the divider between settings was padding on the control
       itself, which went inside its grey track — 16px more above the segments
       than below. */
    await page.getByRole("button", { name: "WCAG 2", exact: true }).click();
    const sheet = page.getByRole("dialog", { name: "WCAG contrast" });
    const track = await sheet
      .getByRole("radiogroup", { name: "Measure against" })
      .boundingBox();
    const segment = await sheet
      .getByRole("radio", { name: "White" })
      .boundingBox();
    const above = segment!.y - track!.y;
    const below = track!.y + track!.height - (segment!.y + segment!.height);
    expect(
      Math.abs(above - below),
      `${above} above, ${below} below`,
    ).toBeLessThanOrEqual(1);

    await expect(sheet.getByText("Measure against")).toBeVisible();
  });

  test("discards the Vision draft on Escape and on the scrim", async ({
    seededPage: page,
  }) => {
    const chip = page.getByRole("button", { name: "Vision", exact: true });
    const sheet = page.getByRole("dialog", { name: "Vision simulation" });

    /* The sheet opens with simulation on in the draft; nothing is committed
       until Apply. */
    await chip.click();
    await expect(sheet.getByRole("switch")).toBeChecked();
    await page.keyboard.press("Escape");
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

  test("puts Reset preset beside Vision, behind a confirm sheet", async ({
    seededPage: page,
  }) => {
    const toolbar = page.getByLabel("Palette toolbar");
    const vision = await toolbar
      .getByRole("button", { name: "Vision", exact: true })
      .boundingBox();
    const reset = toolbar.getByRole("button", { name: "Reset preset" });
    /* One Reset preset on a phone, and it is the icon: the label is hidden. */
    await expect(reset).toHaveCount(1);
    const box = await reset.boundingBox();
    expect(box!.x - (vision!.x + vision!.width)).toBeLessThanOrEqual(16);
    expect(box!.x).toBeGreaterThan(vision!.x);
    expect(
      Math.abs(box!.y + box!.height / 2 - (vision!.y + vision!.height / 2)),
    ).toBeLessThanOrEqual(2);

    /* A sheet from the bottom edge, not a centred alert. */
    await reset.click();
    const sheet = page.getByRole("dialog", { name: "Reset to Blueprint 20?" });
    await expect(sheet).toBeVisible();
    const panel = await sheet.locator(".astryx-bottom-sheet").boundingBox();
    /* At or past the bottom edge: Astryx keeps 48px of the panel below the
       screen as room for the slide. And in the lower half, where a centred
       alert would not be. */
    expect(panel!.y + panel!.height).toBeGreaterThanOrEqual(844);
    expect(panel!.y).toBeGreaterThan(844 / 2);

    /* A thumb's target: 44px, not the 36px a large button is beside a
       field. */
    for (const name of ["Reset preset", "Cancel"]) {
      const box = await sheet.getByRole("button", { name }).boundingBox();
      expect(Math.round(box!.height), name).toBe(44);
    }

    await sheet.getByRole("button", { name: "Cancel" }).click();
    await expect(sheet).toBeHidden();

    await reset.click();
    await sheet.getByRole("button", { name: "Reset preset" }).click();
    await expect(sheet).toBeHidden();
  });

  test("shows every semantic token, with no group sidebar", async ({
    seededPage: page,
  }) => {
    /* Chosen on a desktop, then the window narrows: the group has to let go,
       or a filter nobody can see goes on hiding tokens. */
    await page.setViewportSize({ width: 1280, height: 844 });
    await page.getByRole("button", { name: "Semantics" }).click();
    const editor = page.getByRole("region", { name: "Semantic tokens" });
    const rows = editor.locator("tbody tr");
    const groups = editor.getByRole("navigation", { name: "Token groups" });

    await expect(rows.first()).toBeVisible();
    const all = await rows.count();
    await groups.getByRole("listitem").nth(1).click();
    await expect.poll(() => rows.count()).toBeLessThan(all);

    await page.setViewportSize(PHONE);
    await expect(groups).toBeHidden();
    await expect.poll(() => rows.count()).toBe(all);

    const [table, width] = await Promise.all([
      editor.locator("table").boundingBox(),
      page.evaluate(() => window.innerWidth),
    ]);
    /* The table has the width the sidebar had: its left edge is the editor
       padding, not 56px of rail and a gap. */
    expect(table!.x).toBeLessThan(24);
    expect(width).toBe(PHONE.width);
  });

  /* Not /typography: the seeded project has no type system, so that studio
     shows its create screen, with no tabs to underline. Its bar has the same
     rule as these two. */
  test("picks a semantic colour from one searchable sheet", async ({
    seededPage: page,
  }) => {
    /* One list of every shade, found by typing, instead of a track selector
       and a weight selector in a popover. */
    await page.getByRole("button", { name: "Semantics" }).click();
    const chip = page
      .getByRole("button", { name: / light reference$/ })
      .first();
    const chipName = await chip.getAttribute("aria-label");
    await chip.click();

    const sheet = page.getByRole("dialog", {
      name: chipName!.replace(/^Edit /, "").replace(/ reference$/, ""),
    });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole("combobox")).toHaveCount(0);

    await sheet.getByRole("textbox").fill("secondary 500");
    await sheet
      .getByRole("option", { name: "secondary 500", exact: true })
      .click();

    await expect(sheet).toBeHidden();
    await expect(page.getByRole("button", { name: chipName! })).toContainText(
      "secondary/500",
    );
  });

  /* A sideways scroller runs to the edge of what clips it, and its content
     starts and ends a gutter clear of that edge: full bleed. */
  /* A phone selector's search: 16px, its divider the sheet's full width. */
  const expectSheetSearch = async (page: Page) => {
    const search = page
      .locator(".astryx-bottom-sheet")
      .filter({ visible: true })
      .last()
      .locator("label:has(input)")
      .first();
    await expect(search).toBeVisible();
    const { inset, fontSize } = await search.evaluate((node) => {
      const sheet = node.closest(".astryx-bottom-sheet")!;
      const box = node.getBoundingClientRect();
      const edge = sheet.getBoundingClientRect();
      return {
        inset: [
          Math.round(box.left - edge.left),
          Math.round(edge.right - box.right),
        ],
        fontSize: getComputedStyle(node.querySelector("input")!).fontSize,
      };
    });
    /* Within the sheet's own 1px border, either side. */
    expect(inset[0]).toBeLessThanOrEqual(1);
    expect(inset[1]).toBeLessThanOrEqual(1);
    expect(fontSize).toBe("16px");
    /* A held header in the sheet's own paint, whatever page it opens over. */
    const [head, panel] = await search.evaluate((node) => [
      getComputedStyle(node.parentElement!).backgroundColor,
      getComputedStyle(node.closest(".astryx-bottom-sheet")!).backgroundColor,
    ]);
    if (head !== "rgba(0, 0, 0, 0)") expect(head).toBe(panel);
  };

  const expectFullBleed = async (bleed: Locator, gutter: number) => {
    /* The box that actually scrolls: the bleed itself, or a table's own
       scroll box inside it, which is what cut the table at the gutter. */
    const measure = () =>
      bleed.evaluate((outer) => {
        let clip = outer.parentElement!;
        while (getComputedStyle(clip).overflowX === "visible") {
          clip = clip.parentElement!;
        }
        const scroller =
          outer.querySelector<HTMLElement>(".astryx-table-scroll-wrapper") ??
          outer;
        const edge = clip.getBoundingClientRect();
        const box = scroller.getBoundingClientRect();
        const content = scroller.firstElementChild!.getBoundingClientRect();
        return {
          outside: [
            Math.round(box.left - edge.left),
            Math.round(edge.right - box.right),
          ],
          start: content.left - box.left,
          end: box.right - content.right,
        };
      });
    const atStart = await measure();
    expect(atStart.outside).toEqual([0, 0]);
    expect(atStart.start).toBeCloseTo(gutter, 0);
    await bleed.evaluate((outer) => {
      const scroller =
        outer.querySelector<HTMLElement>(".astryx-table-scroll-wrapper") ??
        outer;
      scroller.scrollLeft = scroller.scrollWidth;
    });
    await expect.poll(async () => (await measure()).end).toBeCloseTo(gutter, 0);
  };

  test("runs its sideways tables full bleed, with a gutter at each end", async ({
    seededPage: page,
  }) => {
    await page.goto("/colour");
    await expectFullBleed(page.locator("[class*='matrixScroller']"), 18);

    await page.getByRole("button", { name: "Semantics" }).click();
    await expectFullBleed(page.locator("[class*='tableWrap']"), 16);

    for (const route of ["/spacing", "/radius"]) {
      await page.goto(route);
      await page
        .getByRole("navigation", { name: "Scale sections" })
        .getByRole("button", { name: "Uses" })
        .click();
      await expectFullBleed(page.locator("[class*='usesScroll']").first(), 18);
    }
  });

  test("scrolls the Uses table and picks a step from a sheet", async ({
    seededPage: page,
  }) => {
    /* Three device columns shared out by a phone broke "40" over two lines.
       Each column now has a width, and the table scrolls sideways instead. */
    await page.goto("/spacing");
    await page
      .getByRole("navigation", { name: "Scale sections" })
      .getByRole("button", { name: "Uses" })
      .click();
    const uses = page.getByRole("region", { name: "Spacing uses" });
    const scroller = uses.locator("table").locator("xpath=..");
    const { width, scrollWidth } = await scroller.evaluate((node) => ({
      width: node.getBoundingClientRect().width,
      scrollWidth: node.scrollWidth,
    }));
    expect(scrollWidth).toBeGreaterThan(width);

    await uses.getByLabel("Container inset on Phone").click();
    const sheet = page.getByRole("dialog", { name: "Spacing steps" });
    await expect(sheet).toBeVisible();
    await expectSheetSearch(page);
    await expect(
      sheet.getByRole("listbox", { name: "Spacing steps" }),
    ).toBeVisible();
  });

  test("lays the token search out as two rows", async ({
    seededPage: page,
  }) => {
    await page.getByRole("button", { name: "Semantics" }).click();
    const editor = page.getByRole("region", { name: "Semantic tokens" });
    const [bar, search, add, count] = await Promise.all([
      editor.locator("header").first().boundingBox(),
      /* The field, not the textbox: the <input> sits inside the field's
         own border and padding. */
      editor
        .locator("header")
        .first()
        .locator(":scope > div", {
          has: page.getByRole("textbox", { name: "Search tokens" }),
        })
        .boundingBox(),
      editor.getByRole("group", { name: "Add" }).boundingBox(),
      editor.locator("[data-selection-count]").boundingBox(),
    ]);

    /* Row one: the search runs from the bar's start to Add token, which
       ends the row. */
    expect(Math.abs(search!.x - bar!.x)).toBeLessThanOrEqual(1);
    expect(add!.x).toBeGreaterThan(search!.x + search!.width);
    expect(
      Math.abs(add!.x + add!.width - (bar!.x + bar!.width)),
    ).toBeLessThanOrEqual(1);
    expect(add!.x - (search!.x + search!.width)).toBeLessThanOrEqual(16);

    /* Row two: the counter, under them and at the start. */
    expect(count!.y).toBeGreaterThanOrEqual(search!.y + search!.height);
    expect(Math.abs(count!.x - bar!.x)).toBeLessThanOrEqual(1);
    await expect(editor.locator("[data-selection-count]")).toHaveText(
      /^\d+ tokens$/,
    );
  });

  for (const route of ["/colour", "/spacing"]) {
    test(`sets the tab underline on the top bar border on ${route}`, async ({
      seededPage: page,
    }) => {
      /* The tabs are the bar's last row. Bottom padding on the bar lifted
         their underline 8px off its border. */
      await page.goto(route);
      /* Through locators, which wait for the tabs to render after goto. */
      const underline = await page
        .locator(".astryx-tab-indicator.selected")
        .boundingBox();
      const bar = await page.locator('header[class*="topbar"]').boundingBox();
      expect(
        Math.abs(underline!.y + underline!.height - (bar!.y + bar!.height)),
      ).toBeLessThanOrEqual(1);
    });
  }

  test("previews as a phone, with Reset to default as an icon", async ({
    page,
  }) => {
    /* Desktop chosen on a wide screen, then the window narrows. */
    await page.setViewportSize({ width: 1280, height: 844 });
    await openPreview(page);
    const devices = page.getByRole("navigation", { name: "Preview devices" });
    await devices.getByRole("button", { name: "Desktop" }).click();
    const frame = page.locator("[data-preview-device]");
    await expect(frame).toHaveAttribute("data-preview-device", "desktop");

    await page.setViewportSize(PHONE);
    await expect(frame).toHaveAttribute("data-preview-device", "phone");
    await expect(devices).toBeHidden();

    /* One reset, and it is the icon: a button with no text of its own. */
    const reset = page
      .locator('header[aria-label="Preview"]')
      .getByRole("button", { name: "Reset to default" });
    await expect(reset).toHaveCount(1);
    expect((await reset.innerText()).trim()).toBe("");

    /* The choice made on the wide screen is kept for when it is wide again. */
    await page.setViewportSize({ width: 1280, height: 844 });
    await expect(frame).toHaveAttribute("data-preview-device", "desktop");
  });

  test("opens a shade's details in a sheet", async ({ seededPage: page }) => {
    /* From a device: the popover sat over the middle of the rows it
       described. */
    const swatch = page.getByRole("button", { name: /^Select / }).nth(5);
    await swatch.click();

    const sheet = page.getByRole("dialog", { name: /shade details$/ });
    await expect(sheet).toBeVisible();
    /* The first: a picker opened from this sheet has one of its own inside. */
    await expect(sheet.locator(".astryx-bottom-sheet").first()).toBeVisible();
    /* As on a desktop: no sliders in the sheet. The edit button beside the
       value opens the picker. */
    await expect(sheet.getByRole("slider")).toHaveCount(0);
    await expect(
      sheet.getByRole("button", { name: /^Edit .* colour$/ }),
    ).toBeVisible();

    /* Nothing is wider than the sheet. Screen-reader-only text is 1px wide
       and clipped on purpose, so it is not counted. */
    const scrolls = await sheet.evaluate((dialog) =>
      [...dialog.querySelectorAll<HTMLElement>("*")]
        .filter((node) => node.clientWidth > 1)
        .filter((node) => node.scrollWidth > node.clientWidth + 1)
        .filter((node) => getComputedStyle(node).overflowX !== "visible")
        .map((node) => `${node.scrollWidth} in ${node.clientWidth}`),
    );
    expect(scrolls, scrolls.join(" | ")).toEqual([]);

    /* The anchor switch pins the shade. */
    const anchor = sheet.getByRole("switch", { name: "Anchor" });
    await expect(anchor).not.toBeChecked();
    await anchor.click();
    await expect(anchor).toBeChecked();
    await expect(swatch).toHaveAttribute("data-anchor", "true");

    await expect(
      sheet.getByRole("button", { name: "Close shade details" }),
    ).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    await expect(swatch).toHaveAttribute("aria-pressed", "false");
  });

  test("stacks the colour picker as a second sheet over the shade's", async ({
    seededPage: page,
  }) => {
    /* From a device: the picker opened as a popover in the middle of the
       screen, over the sheet it was opened from. */
    await page
      .getByRole("button", { name: /^Select / })
      .nth(5)
      .click();
    const shadeSheet = page.getByRole("dialog", { name: /shade details$/ });
    await expect(shadeSheet).toBeVisible();

    const open = () =>
      shadeSheet.getByRole("button", { name: /^Edit .* colour$/ }).click();
    const picker = page.getByRole("dialog", { name: /colour picker$/ });

    await open();
    /* First: the picker's own panel. Its colour format selector holds a
       closed sheet of its own, which also matches. */
    await expect(picker.locator(".astryx-bottom-sheet").first()).toBeVisible();
    /* Above the shade sheet: its panel reaches the bottom edge, and it is the
       one a tap at the middle of the screen lands in. */
    const panel = await picker
      .locator(".astryx-bottom-sheet")
      .first()
      .boundingBox();
    expect(panel!.y + panel!.height).toBeGreaterThanOrEqual(844);
    expect(panel!.y).toBeGreaterThan(844 / 4);

    /* The field and the hue slider, sized for a thumb. */
    const field = await picker
      .getByRole("button", { name: /saturation .* brightness/ })
      .boundingBox();
    expect(field!.height).toBeGreaterThanOrEqual(240);
    expect(field!.width).toBeGreaterThan(300);
    await expect(picker.getByRole("slider", { name: /hue$/ })).toBeVisible();

    /* Sized to what is in it: no band of empty sheet under the value field. */
    const sheetBox = await picker
      .locator(".astryx-bottom-sheet")
      .first()
      .boundingBox();
    const valueBox = await picker
      .locator("footer[class*=colourPickerFooter]")
      .boundingBox();
    expect(
      sheetBox!.y + sheetBox!.height - (valueBox!.y + valueBox!.height),
    ).toBeLessThan(80);

    /* No close button; every way out returns to the shade sheet, still
       open. */
    await expect(
      picker.getByRole("button", { name: /^Close .* picker$/ }),
    ).toHaveCount(0);
    await page.mouse.click(195, 40);
    await expect(picker).toBeHidden();
    await expect(shadeSheet).toBeVisible();

    await open();
    await expect(picker).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(picker).toBeHidden();
    await expect(shadeSheet).toBeVisible();
  });

  test("drags on the picker field without swiping the sheet away", async ({
    seededPage: page,
  }) => {
    /* The sheet is swiped shut by a touch pulling down from the top of its
       scroll, and the field is dragged by a touch too. A real touch, through
       the DevTools protocol: a mouse drag never reaches the sheet's touch
       listeners. */
    await page
      .getByRole("button", { name: /^Select / })
      .nth(5)
      .click();
    const shadeSheet = page.getByRole("dialog", { name: /shade details$/ });
    await shadeSheet.getByRole("button", { name: /^Edit .* colour$/ }).click();
    const picker = page.getByRole("dialog", { name: /colour picker$/ });
    const field = picker.getByRole("button", {
      name: /saturation .* brightness/,
    });
    await expect(field).toBeVisible();
    const before = await field.getAttribute("aria-label");
    const box = (await field.boundingBox())!;

    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true });
    const x = box.x + box.width / 2;
    const y = box.y + 20;
    const touch = (type: "touchStart" | "touchMove" | "touchEnd", dy: number) =>
      cdp.send("Input.dispatchTouchEvent", {
        type,
        touchPoints: type === "touchEnd" ? [] : [{ x, y: y + dy }],
      });
    await touch("touchStart", 0);
    for (let dy = 20; dy <= 200; dy += 20) await touch("touchMove", dy);
    await touch("touchEnd", 200);

    await expect(picker).toBeVisible();
    await expect(field).not.toHaveAttribute("aria-label", before!);
    const after = await picker
      .locator(".astryx-bottom-sheet")
      .first()
      .boundingBox();
    expect(after!.y + after!.height).toBeGreaterThanOrEqual(844);
  });

  test("closes only the sheet that is sliding away when Escape comes early", async ({
    seededPage: page,
  }) => {
    /* Three stacked: a track's sheet, the colour picker over it, and the
       format sheet over that. An Escape pressed while the format sheet was
       still sliding away, when focus had already left it for the body, used
       to close all three: the browser sends `cancel` to the closing sheet,
       and React carries it up through the sheets beneath.

       The browser's `cancel` is fired here directly, on the format sheet.
       Pressing Escape "while it slides away" raced the animation: with
       reduced motion the slide-out is near instant, so the key usually
       landed after the sheet had closed and focus had gone back into the
       picker, where Escape rightly closes the picker. It failed four runs in
       five, on main as well. The event is what the bug was about; the
       timing was only how a person happened to reach it. */
    await page
      .getByRole("button", { name: /^Open .* colour details$/ })
      .first()
      .click();
    const track = page.getByRole("dialog", { name: /colour details$/ });
    await track
      .getByRole("button", { name: /^Choose .* source colour$/ })
      .click();
    const picker = page.getByRole("dialog", { name: /source colour picker$/ });
    await picker.getByRole("button", { name: /^Colour format: / }).click();
    const formats = page.getByRole("dialog", { name: "Colour format" });
    await expect(formats).toBeVisible();
    await expect(page.locator("dialog[open]")).toHaveCount(3);

    await formats.evaluate((dialog) =>
      dialog.dispatchEvent(new Event("cancel", { cancelable: true })),
    );

    await expect(formats).toBeHidden();
    await expect(page.locator("dialog[open]")).toHaveCount(2);
    await expect(picker).toBeVisible();
    await expect(track).toBeVisible();
  });

  test("switches colour format from inside every sheet", async ({
    seededPage: page,
  }) => {
    /* From a device: the format menu in the picker sheet showed and could not
       be tapped. Astryx moves a menu out of any span above it, and a span
       above the picker put the menu outside the sheet's modal dialog, which
       makes everything outside it inert. Tried from each sheet that holds a
       format menu. */
    /* The format is itself a sheet on a phone, opened over the one it
       sits in. */
    const choose = async (
      sheet: ReturnType<typeof page.getByRole>,
      format: "HEX" | "RGB" | "OKLCH",
    ) => {
      const open = page.locator("dialog[open]");
      const before = await open.count();
      const trigger = sheet.getByRole("button", { name: /colour format: /i });
      await trigger.click();
      const formats = page.getByRole("dialog", { name: /colour format$/i });
      await formats.getByRole("option", { name: format }).click();
      await expect(formats).toBeHidden();
      /* Closed, not only hidden: it is still an open dialog while it slides
         away, and an Escape pressed then is its own, not the sheet below. */
      await expect(open).toHaveCount(before);
      await expect(trigger).toHaveAccessibleName(
        new RegExp(`colour format: ${format}$`, "i"),
      );
    };

    /* The shade sheet's own menu, then the picker opened from it. */
    await page
      .getByRole("button", { name: /^Select / })
      .nth(5)
      .click();
    const shade = page.getByRole("dialog", { name: /shade details$/ });
    await choose(shade, "RGB");
    await shade.getByRole("button", { name: /^Edit .* colour$/ }).click();
    const shadePicker = page.getByRole("dialog", { name: /colour picker$/ });
    await choose(shadePicker, "OKLCH");
    await expect(
      shadePicker.getByRole("slider", { name: "Lightness slider" }),
    ).toBeVisible();
    await choose(shadePicker, "HEX");
    await expect(shadePicker).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(shadePicker).toBeHidden();
    /* Hidden to Playwright is not closed: the sheet is still an open dialog
       while it slides away, and an Escape pressed then lands on it. */
    await expect(page.locator("dialog[open]")).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(shade).toBeHidden();

    /* The picker opened from a track's sheet. */
    await page
      .getByRole("button", { name: /^Open .* colour details$/ })
      .first()
      .click();
    const track = page.getByRole("dialog", { name: /colour details$/ });
    await track
      .getByRole("button", { name: /^Choose .* source colour$/ })
      .click();
    const trackPicker = page.getByRole("dialog", {
      name: /source colour picker$/,
    });
    await choose(trackPicker, "OKLCH");
    await expect(trackPicker).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(trackPicker).toBeHidden();
    /* Hidden to Playwright is not closed: the sheet is still an open dialog
       while it slides away, and an Escape pressed then lands on it. */
    await expect(page.locator("dialog[open]")).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(track).toBeHidden();

    /* The picker for the WCAG custom colour. */
    await page.getByRole("button", { name: "WCAG 2", exact: true }).click();
    const wcag = page.getByRole("dialog", { name: "WCAG contrast" });
    await wcag.getByRole("radio", { name: "Custom" }).click();
    await wcag
      .getByRole("button", { name: /^Choose custom contrast colour$/i })
      .click();
    const wcagPicker = page.getByRole("dialog", {
      name: /custom contrast colour picker$/i,
    });
    await choose(wcagPicker, "RGB");
    await expect(wcagPicker).toBeVisible();
  });

  test("opens a track's details in a sheet", async ({ seededPage: page }) => {
    await page
      .getByRole("button", { name: /^Open .* colour details$/ })
      .first()
      .click();

    const sheet = page.getByRole("dialog", { name: /colour details$/ });
    /* The first: a picker opened from this sheet has one of its own inside. */
    await expect(sheet.locator(".astryx-bottom-sheet").first()).toBeVisible();
    /* As on a desktop: no sliders in the sheet. The swatch opens the
       picker, as a second sheet over this one. */
    await expect(
      sheet.getByRole("slider", { name: "Lightness slider" }),
    ).toHaveCount(0);
    await sheet
      .getByRole("button", { name: /^Choose .* source colour$/ })
      .click();
    const picker = page.getByRole("dialog", {
      name: /source colour picker$/,
    });
    await expect(picker.locator(".astryx-bottom-sheet").first()).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(picker).toBeHidden();
    /* Closed, not only hidden. The picker sits inside this sheet in the DOM
       and is still an open dialog while it slides away, and the overflow
       check below would measure it mid-exit rather than this sheet at rest. */
    await expect(page.locator("dialog[open]")).toHaveCount(1);

    /* Save, and no Cancel or close button beside it. The footer fits: a
       narrow screen once cut Save changes off and scrolled sideways. */
    await expect(
      sheet.getByRole("button", { name: "Save changes" }),
    ).toBeInViewport({ ratio: 1 });
    await expect(
      sheet.getByRole("button", { name: /^(Cancel|Close colour details)$/ }),
    ).toHaveCount(0);
    const scrolls = await sheet.evaluate((dialog) =>
      [...dialog.querySelectorAll<HTMLElement>("*")]
        .filter((node) => node.clientWidth > 1)
        .filter((node) => node.scrollWidth > node.clientWidth + 1)
        .filter((node) => getComputedStyle(node).overflowX !== "visible")
        .map((node) => `${node.scrollWidth} in ${node.clientWidth}`),
    );
    expect(scrolls, scrolls.join(" | ")).toEqual([]);

    /* Sized to what is in it, not to most of the screen. */
    const panel = await sheet
      .locator(".astryx-bottom-sheet")
      .first()
      .boundingBox();
    const footer = await sheet
      .locator("footer[class*=trackDialogFooter]")
      .boundingBox();
    expect(
      panel!.y + panel!.height - (footer!.y + footer!.height),
    ).toBeLessThan(80);

    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
  });

  test("sets the font picker sheet at 16px, with thumb-sized rows", async ({
    page,
  }) => {
    /* Like every phone selector: under 16px, iOS zooms the page as the
       search takes focus, and a popover's 12px rows are hard to hit. */
    await seedTypographyProject(page);
    await page.getByRole("button", { name: /^Type settings/ }).click();
    const settings = page.getByRole("dialog", { name: "Type scale settings" });
    await settings.getByRole("button", { name: /^Base font: / }).click();

    const search = page.getByLabel("Base font", { exact: true });
    const option = page.getByRole("option").first();
    await expect(option).toBeVisible();
    const px = (locator: typeof option) =>
      locator.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(await px(search)).toBe(16);
    expect(await px(option)).toBe(16);
    expect((await option.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  });

  test("gives the type specimens the height, and settings a sheet", async ({
    page,
  }) => {
    /* From a device: the specimens and the settings split the screen, and
       the specimens had room for two or three lines. */
    await seedTypographyProject(page);
    const steps = page.getByRole("region", { name: "Generated type steps" });
    await expect(steps).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Type scale settings" }),
    ).toBeHidden();

    const box = await steps.boundingBox();
    expect(box!.y + box!.height).toBeGreaterThanOrEqual(PHONE.height - 1);
    expect(box!.height).toBeGreaterThan(PHONE.height / 2);

    await page.getByRole("button", { name: /^Type settings/ }).click();
    const sheet = page.getByRole("dialog", { name: "Type scale settings" });
    /* The first: each group's delete confirmation is a sheet inside it. */
    await expect(sheet.locator(".astryx-bottom-sheet").first()).toBeVisible();
    for (const tab of ["Settings", "Groups", "Warnings"]) {
      await expect(
        sheet.getByRole("tab", { name: new RegExp(`^${tab}`) }),
      ).toBeVisible();
    }
    await expect(sheet.getByLabel("Base font size")).toBeVisible();

    /* The tabs take a tap. The grab handle floats over the sheet's first
       24px, and with the tabs under it the handle took their taps. */
    const groups = sheet.getByRole("tab", { name: /^Groups/ });
    await groups.click({ timeout: 3000 });
    await expect(groups).toHaveAttribute("aria-selected", "true");

    /* The scrim closes it, back to the specimens. */
    await page.mouse.click(195, 40);
    await expect(sheet).toBeHidden();
  });

  test("folds the type groups, and moves them with buttons", async ({
    page,
  }) => {
    /* Every group open was a scroll of every role in the system; the drag
       handle fought the sheet it sits in; and a role was one row of a table
       576px wide, scrolling sideways inside the sheet. */
    await seedTypographyProject(page);
    await page.getByRole("button", { name: /^Type settings/ }).click();
    const sheet = page.getByRole("dialog", { name: "Type scale settings" });
    await sheet.getByRole("tab", { name: /^Groups/ }).click();
    const panel = sheet.locator("#inspector-groups");

    const toggles = panel.locator("button[aria-controls^='role-group-']");
    const names = () =>
      toggles.evaluateAll((buttons) =>
        buttons.map(
          (b) => b.querySelector("[class*=roleGroupName]")!.textContent,
        ),
      );
    const first = await names();
    expect(first.length).toBeGreaterThan(2);

    /* Only the first open, each with its count. */
    await expect(toggles.first()).toHaveAttribute("aria-expanded", "true");
    for (let i = 1; i < first.length; i += 1) {
      await expect(toggles.nth(i)).toHaveAttribute("aria-expanded", "false");
    }
    await expect(toggles.first()).toContainText(/\d+ roles?$/);

    await toggles.nth(1).click();
    await expect(toggles.nth(1)).toHaveAttribute("aria-expanded", "true");
    await toggles.first().click();
    await expect(toggles.first()).toHaveAttribute("aria-expanded", "false");

    /* No drag handle; a step up or down instead. */
    await expect(
      panel.getByRole("button", { name: /^Reorder .* group$/ }),
    ).toHaveCount(0);
    await expect(
      panel.getByRole("button", { name: `Move ${first[0]} up` }),
    ).toBeDisabled();
    await panel.getByRole("button", { name: `Move ${first[0]} down` }).click();
    await expect.poll(names).toEqual([first[1], first[0], ...first.slice(2)]);

    /* A role is a card: Font and Weight side by side, each captioned, and
       nothing wider than the sheet. */
    const row = panel.locator("[class*=roleTableRow]").first();
    const font = await row.locator("[class*=fontCell]").boundingBox();
    const weight = await row.locator("[class*=weightCell]").boundingBox();
    expect(Math.abs(font!.y - weight!.y)).toBeLessThanOrEqual(1);
    expect(weight!.x).toBeGreaterThan(font!.x + font!.width - 1);
    await expect(row.getByText("Weight", { exact: true })).toBeVisible();
    const scrolls = await panel.evaluate((node) =>
      [...node.querySelectorAll<HTMLElement>("*")]
        .filter((el) => el.clientWidth > 1)
        .filter((el) => el.scrollWidth > el.clientWidth + 1)
        .filter((el) => getComputedStyle(el).overflowX !== "visible")
        /* The role preset chips are one line that scrolls on purpose. */
        .filter((el) => !el.hasAttribute("data-scrolls-sideways"))
        .map((el) => `${el.scrollWidth} in ${el.clientWidth}`),
    );
    expect(scrolls, scrolls.join(" | ")).toEqual([]);

    /* The preset chips stay one line, run to the panel's edge, and keep
       their 16px of room at the start and, scrolled over, at the end. */
    const chips = panel.getByRole("toolbar", { name: "Role presets" });
    const strip = await chips.evaluate((node) => {
      const box = node.getBoundingClientRect();
      const panelBox = node.closest("[role=tabpanel]")!.getBoundingClientRect();
      const tops = [...node.querySelectorAll("button, span")].map((chip) =>
        Math.round(chip.getBoundingClientRect().top),
      );
      const first = node.firstElementChild!.getBoundingClientRect();
      node.scrollLeft = node.scrollWidth;
      const last = node.lastElementChild!.getBoundingClientRect();
      return {
        oneLine: new Set(tops).size === 1,
        left: box.left - panelBox.left,
        right: panelBox.right - box.right,
        start: first.left - box.left,
        end: box.right - last.right,
      };
    });
    expect(strip.oneLine).toBe(true);
    expect(Math.abs(strip.left)).toBeLessThanOrEqual(1);
    expect(Math.abs(strip.right)).toBeLessThanOrEqual(1);
    expect(strip.start).toBeCloseTo(16, 0);
    expect(strip.end).toBeGreaterThanOrEqual(15);

    /* The lone Add group button takes the row. */
    const add = await panel
      .getByRole("button", { name: "Add group" })
      .boundingBox();
    const panelBox = await panel.boundingBox();
    expect(add!.width).toBeGreaterThan(panelBox!.width * 0.8);
  });

  test("keeps a type group's fields inside it, and asks before deleting it", async ({
    page,
  }) => {
    await seedTypographyProject(page);
    await page.getByRole("button", { name: /^Type settings/ }).click();
    const sheet = page.getByRole("dialog", { name: "Type scale settings" });
    await sheet.getByRole("tab", { name: /^Groups/ }).click();
    const group = sheet.locator("#inspector-groups [role=group]").first();
    const name = (await group.locator("[class*=roleGroupName]").textContent())!;

    /* From a device: the line-height and spacing fields kept their natural
       width and ran past the right edge of the card. Nothing may cross the
       inside edge of the group card or of a role card. */
    const escaped = await group.evaluate((card: HTMLElement) => {
      const inner = (el: HTMLElement) => {
        const box = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return (
          box.right -
          parseFloat(style.paddingRight) -
          parseFloat(style.borderRightWidth)
        );
      };
      const boxes = [
        card,
        ...card.querySelectorAll<HTMLElement>("[class*=roleTableRow]"),
      ];
      return boxes.flatMap((box) =>
        [...box.querySelectorAll<HTMLElement>("*")]
          .filter((node) => {
            const rect = node.getBoundingClientRect();
            return rect.width > 0 && rect.right > inner(box) + 1;
          })
          .map((node) => node.tagName),
      );
    });
    expect(escaped, escaped.join(" | ")).toEqual([]);

    /* Each role is a card of its own inside the group. */
    const role = group.locator("[class*=roleTableRow]").first();
    const roleStyle = await role.evaluate((node) => {
      const style = getComputedStyle(node);
      return { border: style.borderTopWidth, padding: style.paddingTop };
    });
    expect(roleStyle).toEqual({ border: "1px", padding: "12px" });

    /* Add role is the last thing in the group, across its width. */
    const rows = group.locator("[class*=roleTableRow]");
    const before = await rows.count();
    const add = group.getByRole("button", { name: "Add role" });
    const addBox = (await add.boundingBox())!;
    const lastRole = (await rows.last().boundingBox())!;
    expect(addBox.y).toBeGreaterThan(lastRole.y + lastRole.height - 1);
    expect(addBox.width).toBeGreaterThan(lastRole.width - 2);
    await add.click();
    await expect(rows).toHaveCount(before + 1);

    /* The group's menu is beside the name, and Delete group asks first. */
    const trash = group.getByRole("button", { name: `${name} group actions` });
    /* H and Body are core groups with no Delete group, so the question is
       asked of Caption. */
    const doomedName = "Caption";
    const doomed = sheet.getByRole("group", { name: doomedName, exact: true });
    const askToDelete = async () => {
      const toggle = doomed.locator("[aria-controls]").first();
      if ((await toggle.getAttribute("aria-expanded")) === "false") {
        await toggle.click();
      }
      await doomed
        .getByRole("button", { name: `${doomedName} group actions` })
        .click();
      await page.getByRole("menuitem", { name: "Delete group" }).click();
    };
    const nameField = group.getByRole("textbox").first();
    const [trashBox, nameBox] = [
      (await trash.boundingBox())!,
      (await nameField.boundingBox())!,
    ];
    expect(
      Math.abs(
        trashBox.y + trashBox.height / 2 - (nameBox.y + nameBox.height / 2),
      ),
    ).toBeLessThanOrEqual(4);

    const confirm = page.getByRole("dialog", {
      name: `Delete group "${doomedName}"?`,
    });
    await askToDelete();
    await expect(confirm).toBeVisible();
    /* Escape closes the question, not the settings under it. */
    await page.keyboard.press("Escape");
    await expect(confirm).toBeHidden();
    await expect(sheet).toBeVisible();
    await expect(page.locator("dialog[open]")).toHaveCount(1);

    await askToDelete();
    await confirm.getByRole("button", { name: "Cancel" }).click();
    await expect(confirm).toBeHidden();
    await expect(
      sheet.locator("[class*=roleGroupName]", { hasText: doomedName }),
    ).toHaveCount(1);

    await askToDelete();
    await confirm.getByRole("button", { name: "Delete group" }).click();
    await expect(
      sheet.locator("[class*=roleGroupName]", { hasText: doomedName }),
    ).toHaveCount(0);
    await expect(sheet).toBeVisible();
  });

  test("keeps the heading group's indexing off, sheet and all", async ({
    page,
  }) => {
    /* The phone selector is this app's own, not Astryx's, so being off has to
       hold here too: tapping it must not open a sheet of choices. */
    await seedTypographyProject(page);
    await page.getByRole("button", { name: /^Type settings/ }).click();
    const sheet = page.getByRole("dialog", { name: "Type scale settings" });
    await sheet.getByRole("tab", { name: /^Groups/ }).click();
    // Groups are folded on a phone; only the first starts open.
    await sheet.getByRole("button", { name: /^H \d+ roles?$/ }).click();

    const indexing = sheet.getByRole("button", { name: "h indexing: Number" });
    await expect(indexing).toBeDisabled();
    await indexing.click({ force: true });
    await expect(page.getByRole("dialog", { name: "h indexing" })).toHaveCount(
      0,
    );

    // Another group's still opens.
    await sheet.getByRole("button", { name: /^display indexing: / }).click();
    await expect(
      page.getByRole("dialog", { name: "display indexing" }),
    ).toBeVisible();
  });

  test("keeps a selector sheet's search at the top while its list scrolls", async ({
    page,
  }) => {
    /* A long list of shades used to carry the title and search off the top
       of the sheet as it scrolled, and with them the way to narrow it. */
    await page.addInitScript(
      ({ pk, p, tk, t }) => {
        window.localStorage.setItem(pk, JSON.stringify(p));
        window.localStorage.setItem(tk, JSON.stringify(t));
      },
      {
        pk: PROJECT_STORAGE_KEY,
        p: defaultProject(),
        tk: TYPOGRAPHY_STORAGE_KEY,
        t: defaultTypographyProject(),
      },
    );
    await page.goto("/typography");
    await page.getByRole("button", { name: "Preview", exact: true }).click();
    await page.getByRole("button", { name: /^Text colour: / }).click();

    const sheet = page.getByRole("dialog", { name: "Text colour" });
    const search = sheet.getByRole("textbox");
    await expect(search).toBeVisible();

    /* To the end of the sheet's own scroll. */
    const scrolled = await sheet.evaluate((dialog) => {
      const scroller = [...dialog.querySelectorAll<HTMLElement>("*")].find(
        (node) =>
          node.scrollHeight > node.clientHeight + 1 &&
          /auto|scroll/.test(getComputedStyle(node).overflowY),
      );
      if (!scroller) return 0;
      scroller.scrollTop = scroller.scrollHeight;
      return scroller.scrollTop;
    });
    expect(scrolled, "the list is long enough to scroll").toBeGreaterThan(200);

    const panel = (await sheet
      .locator(".astryx-bottom-sheet")
      .first()
      .boundingBox())!;
    const box = (await search.boundingBox())!;
    await expect(search).toBeInViewport();
    expect(box.y - panel.y, "the search stays near the top").toBeLessThan(120);
    await expect(
      sheet.getByRole("heading", { name: "Text colour" }),
    ).toBeInViewport();
  });

  test("opens the preview weight as a sheet", async ({ page }) => {
    /* A Google font, so there are weights to choose between. */
    await seedTypographyProject(page, {
      ...defaultTypographyProject(),
      fontFamily: "Inter, ui-sans-serif, system-ui",
    });
    const trigger = page.getByRole("button", { name: /^Preview weight: / });
    await expect(trigger).toBeVisible();
    await trigger.click();
    const sheet = page.getByRole("dialog", { name: "Preview weight" });
    await expect(sheet.locator(".astryx-bottom-sheet").first()).toBeVisible();
    await sheet.getByRole("option").last().click();
    await expect(sheet).toBeHidden();
  });

  test("picks preview colours and text presets from a sheet", async ({
    page,
  }) => {
    /* A dropdown on a phone is a short list under a small trigger. These
       open a sheet from the bottom edge instead, with rows a thumb can hit. */
    await page.addInitScript(
      ({ pk, p, tk, t }) => {
        window.localStorage.setItem(pk, JSON.stringify(p));
        window.localStorage.setItem(tk, JSON.stringify(t));
      },
      {
        pk: PROJECT_STORAGE_KEY,
        p: defaultProject(),
        tk: TYPOGRAPHY_STORAGE_KEY,
        t: defaultTypographyProject(),
      },
    );
    await page.goto("/typography");
    await page.getByRole("button", { name: "Preview", exact: true }).click();

    const textColour = page.getByRole("button", { name: /^Text colour: / });
    await textColour.click();
    const sheet = page.getByRole("dialog", { name: "Text colour" });
    await expect(sheet.locator(".astryx-bottom-sheet")).toBeVisible();

    /* The search is the dropdown's borderless row, 16px, over a divider the
       width of the sheet; Default is Lucide's square-slash. */
    const search = sheet.getByRole("textbox");
    const searchRow = search.locator("xpath=..");
    const css = (locator: typeof search, property: string) =>
      locator.evaluate(
        (el, name) => getComputedStyle(el).getPropertyValue(name),
        property,
      );
    expect(await css(search, "font-size")).toBe("16px");
    expect(await css(search, "border-top-width")).toBe("0px");
    expect(await css(searchRow, "border-bottom-width")).toBe("1px");
    const panel = (await sheet
      .locator(".astryx-bottom-sheet")
      .first()
      .boundingBox())!;
    const rowBox = (await searchRow.boundingBox())!;
    /* Inside the panel's own 1px border on either side. */
    expect(rowBox.width).toBeGreaterThanOrEqual(panel.width - 2);
    await expect(
      sheet
        .getByRole("option", { name: "Default" })
        .locator("svg.lucide-square-slash"),
    ).toBeVisible();

    await search.fill("primary 5");
    await expect(
      sheet.getByRole("option", { name: "neutral 950", exact: true }),
    ).toHaveCount(0);
    const option = sheet.getByRole("option", {
      name: "primary 500",
      exact: true,
    });
    const optionBox = (await option.boundingBox())!;
    expect(optionBox.height).toBeGreaterThanOrEqual(44);
    /* Swatches at 20px, a size a thumb's row carries. */
    const swatchBox = (await option.locator("i").first().boundingBox())!;
    expect(swatchBox.width).toBe(20);
    expect(swatchBox.height).toBe(20);
    await option.click();
    await expect(sheet).toBeHidden();
    await expect(textColour).toHaveAccessibleName("Text colour: primary 500");

    await page.getByRole("button", { name: /^Background colour: / }).click();
    const background = page.getByRole("dialog", { name: "Background colour" });
    await expect(background.locator(".astryx-bottom-sheet")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(background).toBeHidden();

    await page.getByRole("button", { name: /^Text preset: / }).click();
    const presets = page.getByRole("dialog", { name: "Text preset" });
    await expect(presets.locator(".astryx-bottom-sheet")).toBeVisible();
    await expect(presets.getByRole("option").first()).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(presets).toBeHidden();

    /* The row starts where the toolbar above it does. */
    const device = await page
      .getByRole("navigation", { name: "Preview devices" })
      .getByRole("button")
      .first()
      .boundingBox();
    const bar = await page.locator("[class*=previewToolbar]").boundingBox();
    const barPadding = await page
      .locator("[class*=previewToolbar]")
      .evaluate((node) => getComputedStyle(node).paddingLeft);
    expect(barPadding).toBe("14px");
    expect(Math.abs(bar!.x + 14 - device!.x)).toBeLessThanOrEqual(1);
  });

  test("puts a step's size above its specimen, from the left", async ({
    page,
  }) => {
    await seedTypographyProject(page);
    const row = page.locator("[class*=stepRow]").first();
    const meta = await row.locator("[class*=stepMeta]").boundingBox();
    const sample = await row.locator("[class*=stepSampleBox]").boundingBox();
    const card = await row.boundingBox();
    const padding = await row.evaluate((node) =>
      parseFloat(getComputedStyle(node).paddingLeft),
    );

    expect(meta!.y + meta!.height).toBeLessThanOrEqual(sample!.y + 1);
    const firstTag = await row
      .locator("[class*=stepMeta] > *")
      .first()
      .boundingBox();
    expect(Math.abs(firstTag!.x - (card!.x + padding))).toBeLessThanOrEqual(1);
    /* The whole content box: the card less its padding and 1px borders. */
    expect(sample!.width).toBeGreaterThanOrEqual(
      card!.width - 2 * padding - 2 - 1,
    );
  });

  test("stacks the spacing preview's cards, and picks slots from a sheet", async ({
    seededPage: page,
  }) => {
    await page.goto("/spacing");
    const preview = page.getByRole("figure", { name: "Spacing preview" });
    await expect(preview).toBeVisible();

    /* The cards stack, the column gap running between them, and nothing
       runs past the screen. */
    const layout = await preview.evaluate((figure) => {
      const cards = [
        ...figure.querySelectorAll<HTMLElement>('[data-spacing-zone="inset"]'),
      ].map((card) => card.getBoundingClientRect());
      const gap = figure
        .querySelector<HTMLElement>('[data-spacing-zone="columns"]')!
        .getBoundingClientRect();
      return {
        stacked: cards[1]!.top >= cards[0]!.bottom,
        gapHeight: Math.round(gap.height),
        overflow: figure.scrollWidth - figure.clientWidth,
      };
    });
    expect(layout).toEqual({ stacked: true, gapHeight: 16, overflow: 0 });

    /* Every size tag clear of the cards' content, and on the screen. */
    const tags = await spacingTagReport(preview);
    expect(tags.tags).toBeGreaterThan(3);
    expect(tags.hits).toEqual([]);
    expect(tags.offScreen).toEqual([]);

    /* A slot is picked from a sheet, as every selector on a phone is. */
    await page.getByRole("button", { name: /^Stack spacing:/ }).click();
    const sheet = page.getByRole("dialog", { name: "Stack spacing" });
    await expect(sheet.locator(".astryx-bottom-sheet").first()).toBeVisible();
  });

  test("fits every step's value whole, in px and in rem", async ({
    seededPage: page,
  }) => {
    await page.goto("/spacing");
    /* The steps are in the settings, a sheet on a phone. */
    await page
      .getByRole("button", { name: "Spacing settings", exact: true })
      .click();
    const steps = page
      .getByRole("dialog", { name: "Spacing settings" })
      .getByRole("region", { name: "Generated spacing steps" });
    /* Folded until asked for. */
    await openSpacingSteps(page);
    await expect(steps.locator("li").first()).toBeVisible();
    for (const unit of ["px", "rem"]) {
      await steps.getByRole("radio", { name: unit }).click();
      await expect(
        steps.locator('[data-spacing-step="0.5"] [data-spacing-value]'),
      ).toHaveText(unit === "px" ? "2px" : "0.125rem");
      expect(await clippedValues(steps)).toEqual([]);
    }
  });

  test("opens the style presets as a sheet, and a tap applies one", async ({
    seededPage: page,
  }) => {
    /* On a wider screen the presets open to the left of the panel. A phone
       has no left of the panel, so they come up as a sheet over the settings
       sheet, with no close button of their own: the backdrop, a swipe or
       Escape dismiss it, and picking a card applies it and closes. */
    await page.goto("/elevation");
    await page
      .getByRole("button", { name: "Elevation settings", exact: true })
      .click();
    const settings = page.getByRole("dialog", { name: "Elevation settings" });
    const trigger = settings.getByRole("button", { name: /^Style preset: / });
    await trigger.click();

    const presets = page.getByRole("dialog", { name: "Style presets" });
    await expect(presets.locator(".astryx-bottom-sheet").first()).toBeVisible();
    await expect(presets.getByRole("button", { name: /close/i })).toHaveCount(
      0,
    );
    const cards = presets.getByRole("button", { name: /:/ });
    await expect(cards).toHaveCount(5);
    for (const box of await cards.evaluateAll((nodes) =>
      nodes.map((node) => node.getBoundingClientRect().height),
    )) {
      expect(box).toBeGreaterThanOrEqual(44);
    }

    await presets.getByRole("button", { name: /^Inset:/ }).click();
    await expect(presets).toBeHidden();
    await expect(trigger).toHaveAccessibleName("Style preset: Inset");
    await expect(page.locator("dialog[open]")).toHaveCount(1);
    await expect(settings).toBeVisible();
  });

  test("opens a shadow layer's settings as a sheet, not beside the panel", async ({
    seededPage: page,
  }) => {
    /* On a wider screen a layer's settings open to the left of the panel, as
       in Figma. A phone has no left of the panel, so they stack as a sheet
       on the settings sheet, and closing them leaves that one open. */
    await page.goto("/elevation");
    await page
      .getByRole("button", { name: "Elevation settings", exact: true })
      .click();
    const settings = page.getByRole("dialog", { name: "Elevation settings" });
    await settings.getByRole("radio", { name: "Advanced" }).click();
    await settings.getByRole("button", { name: /^Layer 1: / }).click();

    const layer = page.getByRole("dialog", { name: "Layer 1 settings" });
    await expect(layer.locator(".astryx-bottom-sheet").first()).toBeVisible();
    await layer.getByRole("spinbutton", { name: "Layer 1 Blur" }).fill("6");
    await layer
      .getByRole("spinbutton", { name: "Layer 1 Blur" })
      .press("Enter");
    await expect(
      settings.getByRole("button", { name: /^Layer 1: .*B 6/ }),
    ).toHaveCount(1);

    await layer.getByRole("button", { name: "Close Layer 1 settings" }).click();
    await expect(layer).toBeHidden();
    await expect(page.locator("dialog[open]")).toHaveCount(1);
    await expect(settings).toBeVisible();
  });

  for (const [route, section] of [
    ["/spacing", "Spacing"],
    ["/radius", "Radius"],
    ["/elevation", "Elevation"],
  ] as const) {
    test(`gives the ${section.toLowerCase()} canvas the screen, and settings a sheet`, async ({
      seededPage: page,
    }) => {
      /* As in the Typography studio: the canvas has the whole width, and the
         settings are a sheet from the toolbar. */
      await page.goto(route);
      const canvas = page.getByRole("region", { name: `${section} canvas` });
      await expect(canvas).toBeVisible();
      const box = (await canvas.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(PHONE.width - 2);
      await expect(page.locator("[class*=editor] > aside")).toHaveCount(0);

      await page
        .getByRole("button", { name: `${section} settings`, exact: true })
        .click();
      const sheet = page.getByRole("dialog", { name: `${section} settings` });
      await expect(sheet.locator(".astryx-bottom-sheet").first()).toBeVisible();
      await expect(
        /* Visible ones: a closed selector sheet inside holds a search field. */
        sheet
          .locator("input, [role=slider], [role=combobox], button")
          .filter({ visible: true })
          .first(),
      ).toBeVisible();

      if (section === "Elevation") {
        /* Its colour selector is a sheet too, stacked on this one; Escape
           closes only the top one. */
        await sheet.getByRole("button", { name: /^Shadow colour: / }).click();
        const tracks = page.getByRole("dialog", { name: "Shadow colour" });
        await expect(tracks.locator(".astryx-bottom-sheet")).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(tracks).toBeHidden();
        await expect(page.locator("dialog[open]")).toHaveCount(1);
        await expect(sheet).toBeVisible();

        /* A drag along an adjustment slider sets it; the thumb drifting
           down as it goes, as a real one does, does not swipe the sheet
           shut. A real touch, as the sheet listens for touches. */
        const row = sheet
          .getByRole("group", { name: "Low adjustments" })
          .locator("[data-adjustment-row]")
          .first();
        const readout = row.locator("output");
        const before = await readout.textContent();
        const track = (await row.getByRole("slider").boundingBox())!;
        const cdp = await page.context().newCDPSession(page);
        await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true });
        const x = track.x + track.width / 2;
        const y = track.y + track.height / 2;
        const touch = (
          type: "touchStart" | "touchMove" | "touchEnd",
          dx: number,
        ) =>
          cdp.send("Input.dispatchTouchEvent", {
            type,
            touchPoints:
              type === "touchEnd" ? [] : [{ x: x + dx, y: y + dx / 2 }],
          });
        await touch("touchStart", 0);
        for (let dx = 10; dx <= 80; dx += 10) await touch("touchMove", dx);
        await touch("touchEnd", 80);
        await expect(sheet).toBeVisible();
        await expect(readout).not.toHaveText(before!);
      }

      await page.mouse.click(195, 40);
      await expect(sheet).toBeHidden();
    });
  }

  test("centres Export in a top bar with no tabs, level with the menu", async ({
    seededPage: page,
  }) => {
    /* Elevation has no Scale / Uses tabs, so its bar is only Export. */
    await page.goto("/elevation");
    const exportButton = page.getByRole("button", {
      name: "Export",
      exact: true,
    });
    const bar = (await page.locator("header[class*=topbar]").boundingBox())!;
    const box = (await exportButton.boundingBox())!;
    const menu = (await page
      .getByRole("button", { name: "Open navigation" })
      .boundingBox())!;

    expect(Math.abs(box.y - menu.y)).toBeLessThanOrEqual(1);
    const above = box.y - bar.y;
    const below = bar.y + bar.height - (box.y + box.height);
    expect(
      Math.abs(above - below),
      `${above} above, ${below} below`,
    ).toBeLessThanOrEqual(2);
  });

  test("stacks the export dialog into one column", async ({
    seededPage: page,
  }) => {
    /* From a device: the formats kept a 300px column and left the code a
       58px slit beside it. */
    await page.getByRole("button", { name: "Export palette" }).click();
    const dialog = page.getByRole("dialog", { name: "Export design system" });
    await expect(dialog).toBeVisible();

    const formats = dialog.getByRole("group", { name: "Format" });
    const chips = formats.getByRole("button");
    const tops = await chips.evaluateAll((buttons) =>
      buttons.map((button) => Math.round(button.getBoundingClientRect().top)),
    );
    expect(tops.length).toBe(7);
    expect(new Set(tops).size, `chips at ${tops.join(", ")}`).toBe(1);
    expect(
      await formats.evaluate((node) => getComputedStyle(node).overflowX),
    ).toBe("auto");

    /* The chosen format is the filled one. */
    await chips.filter({ hasText: "Tailwind CSS" }).click();
    await expect(chips.filter({ hasText: "Tailwind CSS" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    /* The colour format under the chips, the code the dialog's width. */
    const strip = (await formats.boundingBox())!;
    const colour = (await dialog
      .getByRole("button", { name: /^Export colour format: / })
      .boundingBox())!;
    expect(colour.y).toBeGreaterThanOrEqual(strip.y + strip.height - 1);

    const body = (await dialog
      .locator("[class*=exportDialogBody]")
      .boundingBox())!;
    const preview = (await dialog
      .getByRole("region", { name: "Export preview" })
      .boundingBox())!;
    expect(preview.width).toBeGreaterThanOrEqual(body.width - 1);
    await expect(
      dialog.getByRole("button", { name: "Copy code" }),
    ).toBeInViewport();

    /* The chips run under the dialog's edge rather than stopping short of it. */
    const dialogBox = (await dialog
      .locator("[class*=exportDialogBody]")
      .boundingBox())!;
    expect(Math.abs(strip.x - dialogBox.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(strip.width - dialogBox.width)).toBeLessThanOrEqual(1);

    /* The code fits its room, even the longest output: its bottom does not
       slide under the footer. */
    await chips.filter({ hasText: "Handover (.zip)" }).click();
    const previewRegion = dialog.getByRole("region", {
      name: "Export preview",
    });
    const fits = await previewRegion.evaluate(
      (node) => node.scrollHeight <= node.clientHeight + 1,
    );
    expect(fits, "the code is taller than its room").toBe(true);

    /* Download the width of the footer, and no Import project beside it. */
    const footer = dialog.locator("footer");
    await expect(
      footer.getByRole("button", { name: "Import project" }),
    ).toBeHidden();
    const download = (await footer
      .getByRole("button", { name: "Download" })
      .boundingBox())!;
    const footerBox = (await footer.boundingBox())!;
    expect(download.width).toBeGreaterThanOrEqual(footerBox.width - 2 * 16 - 1);
  });

  test("lays Home out for a phone: header rows and a slot to fill", async ({
    page,
  }) => {
    /* An empty library, as the Home suite starts from. */
    await page.goto("/");
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    await page.reload();
    await createWorkspaceFromHome(page, "First system");
    await page.goto("/");

    /* Row one: the heading and the count beside it. */
    const heading = (await page
      .getByRole("heading", { level: 1, name: "Projects" })
      .boundingBox())!;
    const count = (await page.getByText("1 / 8 used").boundingBox())!;
    expect(
      Math.abs(count.y + count.height / 2 - (heading.y + heading.height / 2)),
    ).toBeLessThanOrEqual(8);
    expect(count.x).toBeGreaterThan(heading.x + heading.width);

    /* Row two: two equal halves, New project first. */
    const create = (await page
      .getByRole("button", { name: "New project", exact: true })
      .boundingBox())!;
    const importButton = (await page
      .getByRole("button", { name: "Import project", exact: true })
      .boundingBox())!;
    expect(create.y).toBeGreaterThan(heading.y + heading.height);
    expect(Math.abs(create.y - importButton.y)).toBeLessThanOrEqual(1);
    expect(create.x).toBeLessThan(importButton.x);
    expect(Math.abs(create.width - importButton.width)).toBeLessThanOrEqual(1);

    /* The next slot, dashed, opens New project. */
    await page.getByRole("button", { name: "Create new workspace" }).click();
    await expect(
      page.getByRole("dialog", { name: "New project" }),
    ).toBeVisible();
  });

  test("opens New project as a sheet: two swipeable rows, then the name", async ({
    page,
  }) => {
    await page.goto("/");
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    await page.reload();
    await page
      .getByRole("button", { name: "New project", exact: true })
      .click();

    const sheet = page.getByRole("dialog", { name: "New project" });
    const panel = sheet.locator(".astryx-bottom-sheet").first();
    await expect(panel).toBeVisible();

    /* A card and a third in view, so the row reads as more. */
    const cards = sheet.getByRole("radio");
    const first = (await cards
      .first()
      .locator("xpath=ancestor::label[1]")
      .boundingBox())!;
    /* Two rows, filled a column at a time: the second card is under the
       first, the third starts the next column. */
    const below = (await cards
      .nth(1)
      .locator("xpath=ancestor::label[1]")
      .boundingBox())!;
    expect(below.x).toBeCloseTo(first.x, 0);
    expect(below.y).toBeGreaterThan(first.y + first.height);
    const second = (await cards
      .nth(2)
      .locator("xpath=ancestor::label[1]")
      .boundingBox())!;
    const box = (await panel.boundingBox())!;
    const inView = box.x + box.width - second.x;
    expect(second.y).toBeCloseTo(first.y, 0);
    expect(inView / second.width).toBeGreaterThan(0.2);
    expect(inView / second.width).toBeLessThan(0.5);
    /* Clear of the sheet's edge, not cut at a margin. */
    expect(first.x - box.x).toBeGreaterThanOrEqual(12);

    /* And the same space after the last card, once scrolled to the end. */
    const last = cards.last().locator("xpath=ancestor::label[1]");
    await last.evaluate((node) => {
      const row = node.closest("[class*='galleryScroll']")!;
      row.scrollLeft = row.scrollWidth;
    });
    await expect
      .poll(async () => {
        const end = (await last.boundingBox())!;
        return box.x + box.width - (end.x + end.width);
      })
      .toBeGreaterThanOrEqual(12);

    /* The name and Create, and none of the preset's details. */
    await expect(sheet.getByLabel("Project name")).toBeInViewport();
    await expect(
      sheet.getByRole("button", { name: "Create workspace" }),
    ).toBeInViewport();
    await expect(sheet.getByText("Typeface")).toBeHidden();
    await expect(sheet.getByText("Preset details")).toBeHidden();
  });

  /* A medium button is 32px, the field it would sit beside; the menu button
     beside Export is 36px. On a phone they share a row. */
  const expectExportLevelWithMenu = async (page: Page) => {
    const exportButton = page.getByRole("button", { name: /^Export/ }).first();
    await expect(exportButton).toBeVisible();
    const menu = (await page
      .getByRole("button", { name: "Open navigation" })
      .boundingBox())!;
    const box = (await exportButton.boundingBox())!;
    expect(Math.round(box.height)).toBe(Math.round(menu.height));
    expect(Math.abs(box.y - menu.y)).toBeLessThanOrEqual(1);
  };

  for (const route of ["/colour", "/spacing", "/elevation"]) {
    test(`makes Export the menu button's height on ${route}`, async ({
      seededPage: page,
    }) => {
      await page.goto(route);
      await expectExportLevelWithMenu(page);
    });
  }

  test("makes Export the menu button's height on /typography", async ({
    page,
  }) => {
    await seedTypographyProject(page);
    await expectExportLevelWithMenu(page);
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

  test("keeps the semantic sheet's search opaque over the shades", async ({
    seededPage: page,
  }) => {
    /* The sticky head named a colour token that does not exist, so it was
       transparent and the swatches scrolled through it. */
    await page.getByRole("button", { name: "Semantics" }).click();
    await page
      .getByRole("button", { name: / light reference$/ })
      .first()
      .click();
    const head = page.getByRole("dialog").locator("[class*=stickyHead]");
    await expect(head).toBeVisible();
    const style = await head.evaluate((node) => {
      const css = getComputedStyle(node);
      return { background: css.backgroundColor, zIndex: css.zIndex };
    });
    expect(style.zIndex).toBe("10");
    // Opaque: no alpha channel, or an alpha of 1.
    expect(style.background).toMatch(
      /^rgb\(|^oklch\([^/]*\)$|^color\([^/]*\)$/,
    );
  });

  for (const route of ["/colour", "/spacing", "/radius", "/elevation"]) {
    test(`leaves room under the last content on ${route}`, async ({
      seededPage: page,
    }) => {
      /* Measured, not read off a stylesheet: a canvas held to the screen's
         height once had 64px of padding sitting behind its last card. */
      await page.goto(route);
      expect(await roomAtTheBottom(page)).toBeGreaterThanOrEqual(64);
    });
  }

  test("keeps the colour page's room inside its settings panel", async ({
    seededPage: page,
  }) => {
    /* The room once sat under the settings as a band of the page's white;
       it belongs to the panel, on the panel's own ground. */
    await page.goto("/colour");
    await expect(
      page.getByText("Lightness", { exact: false }).first(),
    ).toBeVisible();
    const tail = await page.evaluate(() => {
      const editor = document.querySelector(
        "[class*=palette-workspace_editor]",
      )!;
      const last = editor.lastElementChild!;
      const page = editor.parentElement!;
      return {
        below: Math.round(
          page.getBoundingClientRect().bottom -
            last.getBoundingClientRect().bottom,
        ),
        inside: parseFloat(getComputedStyle(last).paddingBottom),
      };
    });
    expect(tail.below).toBe(0);
    expect(tail.inside).toBeGreaterThanOrEqual(64);
  });

  test("leaves room under the last type step", async ({ page }) => {
    await seedTypographyProject(page);
    expect(await roomAtTheBottom(page)).toBeGreaterThanOrEqual(64);
  });

  test("centres the spacing cards, marks shown or hidden", async ({
    seededPage: page,
  }) => {
    await page.goto("/spacing");
    const preview = page.getByRole("figure", { name: "Spacing preview" });
    await expect(preview).toBeVisible();
    const offCentre = () =>
      preview.evaluate((figure) => {
        const box = figure.getBoundingClientRect();
        const card = figure
          .querySelector('[data-spacing-zone="inset"]')!
          .getBoundingClientRect();
        return Math.abs(card.left - box.left - (box.right - card.right));
      });
    expect(await offCentre()).toBeLessThanOrEqual(1);
    await page.getByRole("switch", { name: "Show spacing" }).click();
    await expect.poll(offCentre).toBeLessThanOrEqual(1);
  });

  test("runs the step sheet's search divider edge to edge", async ({
    seededPage: page,
  }) => {
    await page.goto("/spacing");
    await page
      .getByRole("button", { name: "Spacing settings", exact: true })
      .click();
    await page
      .getByRole("dialog", { name: "Spacing settings" })
      .locator("[data-hybrid-chip]")
      .first()
      .click();
    const search = page
      .getByRole("dialog", { name: "Base unit presets" })
      .getByRole("textbox", { name: "Search presets" });
    await expect(search).toBeVisible();
    /* Against the screen, less the sheet's own 1px border: the row meets
       the sheet's inside edges, with no side padding before it. */
    const edges = await search.evaluate((node) => {
      const row = node.closest("label")!.getBoundingClientRect();
      return [row.left, innerWidth - row.right];
    });
    for (const edge of edges) expect(edge).toBeLessThanOrEqual(1);
  });

  test("shares the screen's width between the light and dark grounds", async ({
    seededPage: page,
  }) => {
    await page.goto("/elevation");
    const grounds = page.locator("[class*=elevationGround]");
    await expect(grounds.first()).toBeVisible();
    const layout = await page
      .locator("[class*=elevationModes]")
      .first()
      .evaluate((modes) => {
        const box = modes.getBoundingClientRect();
        /* The width the level's card gives it, less its padding. */
        const parent = modes.parentElement!;
        const css = getComputedStyle(parent);
        const room =
          parent.getBoundingClientRect().width -
          parseFloat(css.paddingLeft) -
          parseFloat(css.paddingRight);
        const halves = [
          ...modes.querySelectorAll("[class*=elevationGround]"),
        ].map((ground) => Math.round(ground.getBoundingClientRect().width));
        return { fills: Math.abs(box.width - room) <= 1, halves };
      });
    expect(layout.fills).toBe(true);
    expect(layout.halves).toHaveLength(2);
    expect(Math.abs(layout.halves[0]! - layout.halves[1]!)).toBeLessThanOrEqual(
      1,
    );
    // Wider than the old 8rem squares on any phone.
    expect(layout.halves[0]!).toBeGreaterThan(128);
  });

  test("rounds a bottom sheet by the sheet radius, top corners only", async ({
    seededPage: page,
  }) => {
    /* A value of its own, unlike the container corner it normally
       matches, so the panel following it is the rule doing its work. */
    await page.getByRole("button", { name: "Semantics" }).click();
    await page
      .getByRole("button", { name: / light reference$/ })
      .first()
      .click();
    const panel = page
      .locator(".astryx-bottom-sheet")
      .filter({ visible: true })
      .first();
    await expect(panel).toBeVisible();
    /* On the panel's parent: the app's theme wrapper redefines the
       token below the root, so an override there would not reach it. */
    const corners = await panel.evaluate((node) => {
      (node.parentElement as HTMLElement).style.setProperty(
        "--radius-sheet",
        "3px 3px 0 0",
      );
      const css = getComputedStyle(node);
      return [
        css.borderTopLeftRadius,
        css.borderTopRightRadius,
        css.borderBottomRightRadius,
        css.borderBottomLeftRadius,
      ];
    });
    expect(corners).toEqual(["3px", "3px", "0px", "0px"]);
  });

  test("opens a spacing tag's steps as a sheet on /preview", async ({
    page,
  }) => {
    /* Every choice on a phone is a sheet, the overlay's tags included. */
    await openPreview(page);
    await page.getByRole("button", { name: "Show spacing" }).click();
    await page
      .getByRole("group", { name: "Spacing overlay" })
      .getByRole("button", { name: /^Section gap on Phone: \d+px/ })
      .first()
      .click();
    /* Each Section gap tag has a sheet of the same name; the open one is
       the one whose list shows. */
    const list = page
      .getByRole("listbox", { name: "Section gap on Phone" })
      .filter({ visible: true });
    await expect(
      list.getByRole("option", { name: "--spacing-8", exact: true }),
    ).toBeVisible();
    expect(
      await list.evaluate((node) => !!node.closest(".astryx-bottom-sheet")),
    ).toBe(true);
    await expectSheetSearch(page);
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
