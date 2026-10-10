import type { Locator, Page } from "@playwright/test";
import { expect, readStoredWorkspace, test } from "./fixtures";
import { openPreview } from "./preview-fixtures";

/**
 * The inspect panel on /preview: a Figma-style column beside the page, in
 * place of the dialogs it replaced. What it offers depends on what is
 * selected, every value is a token, and a change is drawn as it is made.
 */

const HERO_TITLE = "Finish the piece in one place";

const panel = (page: Page) =>
  page.getByRole("complementary", { name: "Inspect" });
const section = (page: Page, name: string) =>
  panel(page).getByRole("region", { name, exact: true });
const heroTitle = (page: Page) =>
  page.getByRole("heading", { name: HERO_TITLE, level: 1 });
const seeThePreview = (page: Page) =>
  page.getByRole("button", { name: "See the preview" });
const heroBand = (page: Page) =>
  page.locator('[data-preview-section="landing-hero"]');

const style = (locator: Locator, property: string) =>
  locator.evaluate(
    (node, name) => getComputedStyle(node).getPropertyValue(name as string),
    property,
  );

/** Picks from the list a control has just opened, by what an option says. */
const pick = async (page: Page, hasText: string | RegExp) => {
  await page.getByRole("option").filter({ hasText }).first().click();
};

/** Opens a control by its name and picks an option. */
const choose = async (
  scope: Locator,
  page: Page,
  control: string,
  hasText: string | RegExp,
) => {
  await scope.getByRole("button", { name: control, exact: true }).click();
  await pick(page, hasText);
};

/* A band is selected by pressing on its own ground, away from its slots. */
const selectHeroBand = async (page: Page) => {
  await heroBand(page).click({ position: { x: 6, y: 6 } });
  await expect(page.getByTestId("preview-selection")).toBeVisible();
  await expect(
    panel(page).getByRole("heading", { name: "Hero", level: 2 }),
  ).toBeVisible();
};

test.describe("The inspect panel's place on the page", () => {
  test("is a column beside the page, not over it, and the selection is outlined", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openPreview(page);
    const site = page.locator("[data-preview-ready]");
    const wide = (await site.boundingBox())!;

    await heroTitle(page).click();
    await expect(panel(page)).toBeVisible();

    /* 317px at the window's right edge, and the page gave up that room. */
    const column = (await panel(page).boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(column.width).toBeCloseTo(317, 0);
    expect(column.x + column.width).toBeCloseTo(viewport.width, 0);
    const narrowed = (await site.boundingBox())!;
    expect(narrowed.width).toBeCloseTo(wide.width - 317, 0);
    expect(narrowed.x + narrowed.width).toBeLessThanOrEqual(column.x + 1);

    /* The outline sits over the element, with its handles and its size. */
    const outline = page.getByTestId("preview-selection");
    const target = (await heroTitle(page).boundingBox())!;
    const box = (await outline.boundingBox())!;
    expect(box.x).toBeCloseTo(target.x, 0);
    expect(box.y).toBeCloseTo(target.y, 0);
    expect(box.width).toBeCloseTo(target.width, 0);
    expect(box.height).toBeCloseTo(target.height, 0);
    await expect(outline.locator("i")).toHaveCount(4);
    await expect(outline.locator("small")).toHaveText(/^\d+ × \d+$/);
  });

  test("is drawn to the design's measures", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openPreview(page);
    await seeThePreview(page).click();

    /* A 50px title, 40px section headings, 24px controls at a 5px radius. */
    const title = (await panel(page).locator("header").first().boundingBox())!;
    expect(title.height).toBeGreaterThanOrEqual(50);
    expect(title.height).toBeLessThan(54);

    const head = (await section(page, "Auto layout")
      .locator("header")
      .boundingBox())!;
    expect(head.height).toBeCloseTo(40, 0);

    const control = section(page, "Appearance").getByRole("button", {
      name: "Corner radius",
      exact: true,
    });
    expect((await control.boundingBox())!.height).toBeCloseTo(24, 0);
    expect(await style(control, "border-top-left-radius")).toBe("5px");

    /* Its heading is 11px and its label 9px, as drawn. */
    expect(
      await style(section(page, "Auto layout").locator("h3"), "font-size"),
    ).toBe("11px");
    expect(
      await style(
        section(page, "Auto layout")
          .locator("span", { hasText: "Padding" })
          .first(),
        "font-size",
      ),
    ).toBe("9px");

    /* A hairline under each section, drawn from a token, not a hex. */
    expect(
      await style(section(page, "Auto layout"), "border-bottom-width"),
    ).toBe("1px");
  });

  test("has a title and nothing under it", async ({ page }) => {
    await openPreview(page);
    await page
      .getByRole("navigation", { name: "Site" })
      .getByText("Home", { exact: true })
      .click();

    const head = panel(page).locator("header").first();
    await expect(head.getByRole("heading", { level: 2 })).toHaveText(
      "Nav links",
    );
    /* No subtitle: the title and its hide button are all the bar holds. */
    await expect(head.locator("small")).toHaveCount(0);
    await expect(head).toHaveText("Nav links");
  });

  test("stacks its buttons full width, medium, 8px apart, with Reset outlined", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openPreview(page);
    await page
      .getByRole("navigation", { name: "Site" })
      .getByText("Home", { exact: true })
      .click();
    await panel(page).getByRole("textbox", { name: "Copy" }).fill("Home page");

    const column = (await panel(page).boundingBox())!;
    const group = panel(page).getByRole("button", { name: "Apply to group" });
    const reset = panel(page).getByRole("button", { name: "Reset to default" });
    await expect(reset).toBeVisible();

    /* Each fills the column between its 16px sides (and its 1px edge). */
    const first = (await group.boundingBox())!;
    const second = (await reset.boundingBox())!;
    for (const box of [first, second]) {
      expect(box.width).toBeCloseTo(column.width - 33, 0);
      expect(box.x).toBeCloseTo(column.x + 17, 0);
    }

    /* One under the next, 8px apart, and the same medium height. */
    expect(second.y - (first.y + first.height)).toBeCloseTo(8, 0);
    expect(second.height).toBeCloseTo(first.height, 0);
    expect(second.height).toBeGreaterThanOrEqual(32);
    expect(second.height).toBeLessThanOrEqual(40);

    /* Reset is the outlined one: an edge of its own and no fill. */
    expect(await style(reset, "border-top-width")).not.toBe("0px");
    expect(await style(reset, "background-color")).toMatch(
      /rgba\(0, 0, 0, 0\)|transparent/,
    );
  });

  test("hides on its own button and comes back from the bar", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openPreview(page);
    const site = page.locator("[data-preview-ready]");
    const before = (await site.boundingBox())!.width;

    await heroTitle(page).click();
    await panel(page).getByRole("button", { name: "Hide inspector" }).click();
    await expect(panel(page)).toBeHidden();
    await expect(page.getByTestId("preview-selection")).toHaveCount(0);
    expect((await site.boundingBox())!.width).toBeCloseTo(before, 0);

    /* The bar's own button brings the column back, saying nothing is chosen. */
    await page.getByRole("button", { name: "Show inspector" }).click();
    await expect(panel(page)).toBeVisible();
    await expect(panel(page)).toContainText("Select text, a button or a band");
  });

  test("follows the selection from one element to the next", async ({
    page,
  }) => {
    await openPreview(page);
    await heroTitle(page).click();
    await expect(
      panel(page).getByRole("textbox", { name: "Copy" }),
    ).toHaveValue(HERO_TITLE);
    await seeThePreview(page).click();
    await expect(
      panel(page).getByRole("textbox", { name: "Copy" }),
    ).toHaveValue("See the preview");
    const outline = (await page
      .getByTestId("preview-selection")
      .boundingBox())!;
    const button = (await seeThePreview(page).boundingBox())!;
    expect(outline.x).toBeCloseTo(button.x, 0);
    expect(outline.width).toBeCloseTo(button.width, 0);
  });
});

test.describe("What each kind of element offers", () => {
  test("text: copy, type, fill and opacity, and no room, edge or shadow", async ({
    page,
  }) => {
    await openPreview(page);
    await heroTitle(page).click();

    await expect(
      panel(page).getByRole("textbox", { name: "Copy" }),
    ).toBeVisible();
    for (const name of ["Typography", "Fill", "Appearance"]) {
      await expect(section(page, name)).toBeVisible();
    }
    for (const name of ["Auto layout", "Stroke", "Effects"]) {
      await expect(section(page, name)).toHaveCount(0);
    }
    /* Opacity is there; a radius is not. */
    await expect(
      section(page, "Appearance").getByRole("textbox", { name: "Opacity" }),
    ).toBeVisible();
    await expect(
      section(page, "Appearance").getByRole("button", {
        name: "Corner radius",
        exact: true,
      }),
    ).toHaveCount(0);
  });

  test("button: copy, type, padding, radius, fill, stroke and effects; no gap or opacity", async ({
    page,
  }) => {
    await openPreview(page);
    await seeThePreview(page).click();

    for (const name of [
      "Auto layout",
      "Appearance",
      "Typography",
      "Fill",
      "Stroke",
      "Effects",
    ]) {
      await expect(section(page, name)).toBeVisible();
    }
    const layout = section(page, "Auto layout");
    await expect(
      layout.getByRole("button", { name: "Gap", exact: true }),
    ).toHaveCount(0);
    await expect(
      layout.getByRole("button", { name: "Padding horizontal", exact: true }),
    ).toBeVisible();
    await expect(
      section(page, "Appearance").getByRole("textbox", { name: "Opacity" }),
    ).toHaveCount(0);
    await expect(
      section(page, "Appearance").getByRole("button", {
        name: "Corner radius",
        exact: true,
      }),
    ).toBeVisible();
    /* A contained button has no edge, so Stroke starts empty with a Plus; it
       does cast a shadow, so Effects shows it. */
    await expect(
      section(page, "Stroke").getByRole("button", { name: "Add stroke" }),
    ).toBeVisible();
    await expect(
      section(page, "Effects").getByRole("button", {
        name: "Shadow",
        exact: true,
      }),
    ).toContainText("Default shadow");
  });

  test("band: gap, padding, opacity, radius, fill, stroke and effects; no copy or type", async ({
    page,
  }) => {
    await openPreview(page);
    await selectHeroBand(page);

    for (const name of [
      "Auto layout",
      "Appearance",
      "Fill",
      "Stroke",
      "Effects",
    ]) {
      await expect(section(page, name)).toBeVisible();
    }
    await expect(section(page, "Typography")).toHaveCount(0);
    await expect(
      panel(page).getByRole("textbox", { name: "Copy" }),
    ).toHaveCount(0);
    await expect(
      section(page, "Auto layout").getByRole("button", {
        name: "Gap",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      section(page, "Appearance").getByRole("textbox", { name: "Opacity" }),
    ).toBeVisible();
  });
});

test.describe("Changing a token redraws the page", () => {
  test("a text's opacity and fill", async ({ page }) => {
    await openPreview(page);
    const title = heroTitle(page);
    const colour = await style(title, "color");

    await title.click();
    const opacity = section(page, "Appearance").getByRole("textbox", {
      name: "Opacity",
    });
    await opacity.fill("40");
    await opacity.press("Enter");
    await expect.poll(() => style(title, "opacity")).toBe("0.4");

    await choose(section(page, "Fill"), page, "Fill", "Foreground accent");
    await expect.poll(() => style(title, "color")).not.toBe(colour);
    await section(page, "Fill")
      .getByRole("button", { name: "Remove fill" })
      .click();
    await expect.poll(() => style(title, "color")).toBe(colour);

    /* Back to the default puts the opacity back with the rest. */
    await panel(page).getByRole("button", { name: "Reset to default" }).click();
    await expect.poll(() => style(title, "opacity")).toBe("1");
    await expect(opacity).toHaveValue("100%");
  });

  test("a button's padding, radius and fill", async ({ page }) => {
    await openPreview(page);
    const button = seeThePreview(page);
    const before = {
      left: await style(button, "padding-left"),
      background: await style(button, "background-color"),
    };
    await button.click();

    /* Padding by axis: both sides take the step. */
    await choose(
      section(page, "Auto layout"),
      page,
      "Padding horizontal",
      "64px",
    );
    await expect
      .poll(() => style(button, "padding-left"))
      .not.toBe(before.left);
    expect(await style(button, "padding-right")).toBe(
      await style(button, "padding-left"),
    );

    /* Each side on its own, and Mixed when the pair disagrees. */
    await section(page, "Auto layout")
      .getByRole("button", { name: "Individual padding" })
      .click();
    await expect(
      section(page, "Auto layout").getByRole("button", {
        name: "Padding horizontal",
        exact: true,
      }),
    ).toHaveCount(0);
    await choose(section(page, "Auto layout"), page, "Padding top", "8px");
    await section(page, "Auto layout")
      .getByRole("button", { name: "Individual padding" })
      .click();
    await expect(
      section(page, "Auto layout").getByRole("button", {
        name: "Padding vertical",
        exact: true,
      }),
    ).toContainText("Mixed");

    /* A corner radius for all four. */
    const radius = section(page, "Appearance").getByRole("button", {
      name: "Corner radius",
      exact: true,
    });
    await radius.click();
    await page.getByRole("option").nth(2).click();
    const said = (await radius.innerText()).match(/(\d+)px/);
    expect(said).not.toBeNull();
    await expect
      .poll(() => style(button, "border-top-left-radius"))
      .toBe(`${said![1]}px`);
    expect(await style(button, "border-bottom-right-radius")).toBe(
      `${said![1]}px`,
    );

    /* A fill, and a label that still reads on it. */
    await choose(section(page, "Fill"), page, "Fill", "Surface raised");
    await expect
      .poll(() => style(button, "background-color"))
      .not.toBe(before.background);
  });

  test("a radius one corner at a time reads Mixed", async ({ page }) => {
    await openPreview(page);
    const button = seeThePreview(page);
    await button.click();
    const appearance = section(page, "Appearance");

    await choose(appearance, page, "Corner radius", /^Full/i);
    await appearance
      .getByRole("button", { name: "Individual corners" })
      .click();
    await choose(appearance, page, "Radius top left", "Default");
    await expect(
      appearance.getByRole("button", { name: "Corner radius", exact: true }),
    ).toContainText("Mixed");
    await expect
      .poll(() => style(button, "border-top-left-radius"))
      .not.toBe(await style(button, "border-top-right-radius"));
  });

  test("a stroke, in each position and weight, and a shadow", async ({
    page,
  }) => {
    await openPreview(page);
    const button = seeThePreview(page);
    /* The button has a shadow of its own, which is the baseline. */
    const own = await style(button, "box-shadow");
    await button.click();

    await section(page, "Stroke")
      .getByRole("button", { name: "Add stroke" })
      .click();
    const stroke = section(page, "Stroke");
    await expect(
      stroke.getByRole("button", { name: "Stroke colour", exact: true }),
    ).toBeVisible();
    await expect.poll(() => style(button, "box-shadow")).toMatch(/inset/);

    await choose(stroke, page, "Stroke position", "Outside");
    await expect.poll(() => style(button, "box-shadow")).not.toMatch(/inset/);
    await choose(stroke, page, "Stroke weight", "3px");
    await expect.poll(() => style(button, "box-shadow")).toMatch(/3px/);

    /* The shadow it had is kept under the stroke, then a level joins it in the
       one box-shadow. */
    await expect(
      section(page, "Effects").getByRole("button", {
        name: "Shadow",
        exact: true,
      }),
    ).toContainText("Default shadow");
    await choose(section(page, "Effects"), page, "Shadow", "shadow-med");
    await expect
      .poll(
        async () =>
          ((await style(button, "box-shadow")) as string).split("rgba").length,
      )
      .toBeGreaterThan(1);

    /* Taking both away leaves the button with neither, and Reset gives it
       back what it had. */
    await section(page, "Effects")
      .getByRole("button", { name: "Remove effect" })
      .click();
    await stroke.getByRole("button", { name: "Remove stroke" }).click();
    await expect.poll(() => style(button, "box-shadow")).toBe("none");
    await expect(
      section(page, "Stroke").getByRole("button", { name: "Add stroke" }),
    ).toBeVisible();
    await expect(
      section(page, "Effects").getByRole("button", { name: "Add effect" }),
    ).toBeVisible();
    await panel(page).getByRole("button", { name: "Reset to default" }).click();
    await expect.poll(() => style(button, "box-shadow")).toBe(own);
  });

  test("a band's gap, padding and opacity", async ({ page }) => {
    await openPreview(page);
    const band = heroBand(page);
    await selectHeroBand(page);

    await choose(section(page, "Auto layout"), page, "Gap", "64px");
    await expect.poll(() => style(band, "row-gap")).not.toBe("normal");
    await choose(
      section(page, "Auto layout"),
      page,
      "Padding vertical",
      "64px",
    );
    expect(await style(band, "padding-top")).toBe(
      await style(band, "padding-bottom"),
    );

    const opacity = section(page, "Appearance").getByRole("textbox", {
      name: "Opacity",
    });
    await opacity.fill("60");
    await opacity.press("Enter");
    await expect.poll(() => style(band, "opacity")).toBe("0.6");
    /* The outline follows the band as its padding grows. */
    const outline = (await page
      .getByTestId("preview-selection")
      .boundingBox())!;
    const box = (await band.boundingBox())!;
    expect(outline.height).toBeCloseTo(box.height, 0);
  });

  test("a band and the slot that shares its id are separate", async ({
    page,
  }) => {
    await openPreview(page);
    const quoteBand = page.locator('[data-preview-section="landing-quote"]');
    const quoteText = page.locator('[data-preview-slot="landing-quote"]');

    await quoteText.click();
    const slotOpacity = section(page, "Appearance").getByRole("textbox", {
      name: "Opacity",
    });
    await slotOpacity.fill("30");
    await slotOpacity.press("Enter");
    await expect.poll(() => style(quoteText, "opacity")).toBe("0.3");
    expect(await style(quoteBand, "opacity")).toBe("1");

    await quoteBand.click({ position: { x: 6, y: 6 } });
    await expect(
      panel(page).getByRole("heading", { name: "Quote", level: 2 }),
    ).toBeVisible();
    await expect(
      section(page, "Appearance").getByRole("textbox", { name: "Opacity" }),
    ).toHaveValue("100%");
  });
});

test.describe("What is changed is kept and can be taken back", () => {
  test("is saved with the project, as references only", async ({ page }) => {
    await openPreview(page);
    const title = heroTitle(page);
    const id = await title.getAttribute("data-preview-slot");
    await title.click();
    const opacity = section(page, "Appearance").getByRole("textbox", {
      name: "Opacity",
    });
    await opacity.fill("40");
    await opacity.press("Enter");
    await expect.poll(() => style(title, "opacity")).toBe("0.4");

    await selectHeroBand(page);
    await choose(section(page, "Auto layout"), page, "Gap", "64px");

    await expect
      .poll(async () => {
        const workspace = await readStoredWorkspace(page);
        return workspace?.typography?.previewStyles ?? null;
      })
      .toMatchObject({ [id!]: { opacity: 40 } });
    const stored = (await readStoredWorkspace(page))!.typography!
      .previewStyles as Record<string, Record<string, unknown>>;
    /* The band is under its own key, and its gap is a step, not a length. */
    expect(typeof stored["band:landing-hero"]?.gap).toBe("number");

    await page.reload();
    await expect(page.locator("[data-preview-ready]")).toBeVisible();
    await expect.poll(() => style(heroTitle(page), "opacity")).toBe("0.4");
    await expect(panel(page)).toHaveCount(0);
  });

  test("is undone with Undo, one step at a time", async ({ page }) => {
    await openPreview(page);
    const title = heroTitle(page);
    await title.click();
    const opacity = section(page, "Appearance").getByRole("textbox", {
      name: "Opacity",
    });
    await opacity.fill("40");
    await opacity.press("Enter");
    await expect.poll(() => style(title, "opacity")).toBe("0.4");
    await opacity.fill("70");
    await opacity.press("Enter");
    await expect.poll(() => style(title, "opacity")).toBe("0.7");

    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
    await page.keyboard.press("Control+z");
    await expect.poll(() => style(title, "opacity")).toBe("0.4");
    await page.keyboard.press("Control+z");
    await expect.poll(() => style(title, "opacity")).toBe("1");
  });

  test("is put back by the page's Reset to default", async ({ page }) => {
    await openPreview(page);
    const button = seeThePreview(page);
    const own = await style(button, "box-shadow");
    await button.click();
    await section(page, "Stroke")
      .getByRole("button", { name: "Add stroke" })
      .click();
    await expect.poll(() => style(button, "box-shadow")).not.toBe(own);

    await page
      .locator("header[aria-label='Preview']")
      .getByRole("button", { name: "Reset to default" })
      .click();
    await expect.poll(() => style(button, "box-shadow")).toBe(own);
    expect(
      (await readStoredWorkspace(page))?.typography?.previewStyles,
    ).toBeUndefined();
  });

  test("leaves a project with no changes exactly as it was", async ({
    page,
  }) => {
    await openPreview(page);
    await heroTitle(page).click();
    const workspace = await readStoredWorkspace(page);
    expect(workspace?.typography?.previewStyles).toBeUndefined();
    expect(JSON.stringify(workspace)).not.toContain("previewStyles");
  });
});

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

  test("is drawn over the sticky nav, and stays on it as the page scrolls", async ({
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

    /* Above the nav in the stack, so the nav does not hide its own outline. */
    const z = await page
      .getByTestId("preview-selection")
      .evaluate((node) => Number(getComputedStyle(node).zIndex));
    const navZ = await style(nav, "z-index");
    expect(z).toBeGreaterThan(Number(navZ === "auto" ? 0 : navZ));
  });
});

test.describe("A stroke is the one edge", () => {
  test("an outlined button shows its own edge, and loses it when it is removed", async ({
    page,
  }) => {
    await openPreview(page);
    const button = page.getByRole("button", { name: "Open the studio" });
    const own = await style(button, "border-top-width");
    expect(own).not.toBe("0px");
    await button.click();

    /* Its edge is in the panel, not an empty Stroke. */
    const colour = section(page, "Stroke").getByRole("button", {
      name: "Stroke colour",
      exact: true,
    });
    await expect(colour).toContainText("Border default");
    await expect(
      section(page, "Stroke").getByRole("button", { name: "Add stroke" }),
    ).toHaveCount(0);

    /* Removed, it is gone: one edge fewer, not two. */
    await section(page, "Stroke")
      .getByRole("button", { name: "Remove stroke" })
      .click();
    await expect.poll(() => style(button, "border-top-width")).toBe("0px");
    await expect(
      section(page, "Stroke").getByRole("button", { name: "Add stroke" }),
    ).toBeVisible();

    /* Reset gives back the edge it was drawn with. */
    await panel(page).getByRole("button", { name: "Reset to default" }).click();
    await expect.poll(() => style(button, "border-top-width")).toBe(own);
    await expect(colour).toContainText("Border default");
  });

  test("a stroke chosen over the native one replaces it", async ({ page }) => {
    await openPreview(page);
    const button = page.getByRole("button", { name: "Open the studio" });
    await button.click();
    await choose(section(page, "Stroke"), page, "Stroke weight", "3px");
    await expect.poll(() => style(button, "border-top-width")).toBe("0px");
    await expect.poll(() => style(button, "box-shadow")).toMatch(/3px/);
    await expect(
      section(page, "Stroke").getByRole("button", {
        name: "Stroke colour",
        exact: true,
      }),
    ).toContainText("Border default");
  });

  test("a card shows its edge and fill, and loses the edge when it is removed", async ({
    page,
  }) => {
    await openPreview(page);
    const card = page
      .locator('[data-preview-slot="card-feature-card"]')
      .first();
    const own = await style(card, "border-top-width");
    expect(own).not.toBe("0px");

    await card.click({ position: { x: 60, y: 6 } });
    await expect(
      section(page, "Stroke").getByRole("button", {
        name: "Stroke colour",
        exact: true,
      }),
    ).toContainText("Border subtle");
    await expect(
      section(page, "Fill").getByRole("button", { name: "Fill", exact: true }),
    ).toContainText("Surface raised");

    await section(page, "Stroke")
      .getByRole("button", { name: "Remove stroke" })
      .click();
    await expect.poll(() => style(card, "border-top-width")).toBe("0px");

    await panel(page).getByRole("button", { name: "Reset to default" }).click();
    await expect.poll(() => style(card, "border-top-width")).toBe(own);
  });

  test("a contained button shows the shadow it casts, and loses it when it is removed", async ({
    page,
  }) => {
    await openPreview(page);
    const button = seeThePreview(page);
    const own = await style(button, "box-shadow");
    expect(own).not.toBe("none");
    await button.click();
    await section(page, "Effects")
      .getByRole("button", { name: "Remove effect" })
      .click();
    await expect.poll(() => style(button, "box-shadow")).toBe("none");
    await panel(page).getByRole("button", { name: "Reset to default" }).click();
    await expect.poll(() => style(button, "box-shadow")).toBe(own);
  });

  test("the panel agrees with the page about which buttons have an edge", async ({
    page,
  }) => {
    await openPreview(page);
    const buttons = [
      ["landing-hero-cta", false],
      ["landing-hero-ghost", true],
      ["landing-split-a-cta", false],
      ["landing-plan-1-cta", true],
      ["landing-plan-2-cta", false],
      ["landing-plan-3-cta", true],
      ["landing-cta-primary", false],
      ["landing-cta-ghost", true],
      ["landing-newsletter-cta", false],
      ["shell-action", false],
    ] as const;
    for (const [id, hasEdge] of buttons) {
      const target = page.locator(`[data-preview-slot="${id}"]`);
      await target.scrollIntoViewIfNeeded();
      await target.click();
      /* The page draws a visible edge exactly when the panel shows one. */
      const drawn = await target.evaluate((node) => {
        const cs = getComputedStyle(node);
        const colour = cs.borderTopColor;
        return (
          parseFloat(cs.borderTopWidth) > 0 &&
          colour !== "rgba(0, 0, 0, 0)" &&
          colour !== cs.backgroundColor
        );
      });
      const shown =
        (await section(page, "Stroke")
          .getByRole("button", { name: "Stroke colour", exact: true })
          .count()) > 0;
      expect({ id, shown }).toEqual({ id, shown: hasEdge });
      expect({ id, drawn }).toEqual({ id, drawn: hasEdge });
    }
  });
});

test.describe("A list's chosen and hovered row", () => {
  test("is a light wash of the text colour, the same for both", async ({
    page,
  }) => {
    await openPreview(page);
    await seeThePreview(page).click();
    await section(page, "Auto layout")
      .getByRole("button", { name: "Padding horizontal", exact: true })
      .click();
    const chosen = page.getByRole("option", { selected: true }).first();
    await expect(chosen).toBeVisible();

    /* Parsed to its alpha: a wash is translucent, a grey fill is not. */
    const alpha = (colour: string) => {
      if (colour.includes("/")) return parseFloat(colour.split("/")[1]!);
      if (colour.startsWith("rgba")) return parseFloat(colour.split(",")[3]!);
      return 1;
    };
    const chosenFill = await style(chosen, "background-color");
    expect(alpha(chosenFill)).toBeLessThan(0.1);
    expect(alpha(chosenFill)).toBeGreaterThan(0);

    const other = page.getByRole("option", { selected: false }).first();
    await other.hover();
    await expect.poll(() => style(other, "background-color")).toBe(chosenFill);
  });
});

test.describe("The Popular tag is a chip", () => {
  const tag = (page: Page) =>
    page.locator('[data-preview-slot="landing-plan-2-tag"]');

  test("offers copy, type, room, shape, fill, text colour and an edge", async ({
    page,
  }) => {
    await openPreview(page);
    await tag(page).click();
    await expect(
      panel(page).getByRole("heading", { name: "Plan tag", level: 2 }),
    ).toBeVisible();

    await expect(
      panel(page).getByRole("textbox", { name: "Copy" }),
    ).toHaveValue("Popular");
    for (const name of [
      "Auto layout",
      "Appearance",
      "Typography",
      "Fill",
      "Stroke",
    ]) {
      await expect(section(page, name)).toBeVisible();
    }
    await expect(section(page, "Effects")).toHaveCount(0);
    await expect(
      section(page, "Appearance").getByRole("textbox", { name: "Opacity" }),
    ).toHaveCount(0);
    await expect(
      section(page, "Appearance").getByRole("button", {
        name: "Corner radius",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      section(page, "Fill").getByRole("button", {
        name: "Label colour",
        exact: true,
      }),
    ).toBeVisible();
  });

  test("takes a fill, a text colour, a radius, padding and a stroke", async ({
    page,
  }) => {
    await openPreview(page);
    const chip = tag(page);
    const before = {
      ground: await style(chip, "background-color"),
      left: await style(chip, "padding-left"),
      radius: await style(chip, "border-top-left-radius"),
    };
    await chip.click();

    await choose(section(page, "Fill"), page, "Fill", "Surface raised");
    await expect
      .poll(() => style(chip, "background-color"))
      .not.toBe(before.ground);

    const ink = await style(chip, "color");
    await section(page, "Fill")
      .getByRole("button", { name: "Label colour", exact: true })
      .click();
    await page.getByRole("option").nth(3).click();
    await expect.poll(() => style(chip, "color")).not.toBe(ink);

    await choose(
      section(page, "Auto layout"),
      page,
      "Padding horizontal",
      "64px",
    );
    await expect.poll(() => style(chip, "padding-left")).not.toBe(before.left);

    const radius = section(page, "Appearance").getByRole("button", {
      name: "Corner radius",
      exact: true,
    });
    await radius.click();
    await page.getByRole("option").nth(1).click();
    await expect
      .poll(() => style(chip, "border-top-left-radius"))
      .not.toBe(before.radius);

    await section(page, "Stroke")
      .getByRole("button", { name: "Add stroke" })
      .click();
    await expect.poll(() => style(chip, "box-shadow")).toMatch(/inset/);

    await panel(page).getByRole("button", { name: "Reset to default" }).click();
    await expect
      .poll(() => style(chip, "background-color"))
      .toBe(before.ground);
    await expect.poll(() => style(chip, "padding-left")).toBe(before.left);
    expect(
      (await readStoredWorkspace(page))?.typography?.previewStyles,
    ).toBeUndefined();
  });
});

test.describe("The newsletter field is a surface", () => {
  const field = (page: Page) =>
    page.locator('[data-preview-slot="card-newsletter-field"]');

  test("is picked by its edge, shows its fill and edge, and takes changes", async ({
    page,
  }) => {
    await openPreview(page);
    const box = field(page);
    await box.scrollIntoViewIfNeeded();
    const before = {
      ground: await style(box, "background-color"),
      radius: await style(box, "border-top-left-radius"),
      edge: await style(box, "border-top-width"),
    };
    expect(before.edge).not.toBe("0px");

    await box.click({ position: { x: 3, y: 3 } });
    await expect(
      panel(page).getByRole("heading", { name: "Newsletter field", level: 2 }),
    ).toBeVisible();
    await expect(page.getByTestId("preview-selection")).toHaveCount(1);
    await expect(
      section(page, "Fill").getByRole("button", { name: "Fill", exact: true }),
    ).toContainText("Surface base");
    await expect(
      section(page, "Stroke").getByRole("button", {
        name: "Stroke colour",
        exact: true,
      }),
    ).toContainText("Border default");

    await choose(section(page, "Fill"), page, "Fill", "Surface raised");
    await expect
      .poll(() => style(box, "background-color"))
      .not.toBe(before.ground);
    const radius = section(page, "Appearance").getByRole("button", {
      name: "Corner radius",
      exact: true,
    });
    await radius.click();
    await page.getByRole("option").nth(1).click();
    await expect
      .poll(() => style(box, "border-top-left-radius"))
      .not.toBe(before.radius);
    await choose(
      section(page, "Auto layout"),
      page,
      "Padding horizontal",
      "64px",
    );
    await expect.poll(() => style(box, "padding-left")).toBe("64px");

    await section(page, "Stroke")
      .getByRole("button", { name: "Remove stroke" })
      .click();
    await expect.poll(() => style(box, "border-top-width")).toBe("0px");

    await panel(page).getByRole("button", { name: "Reset to default" }).click();
    await expect.poll(() => style(box, "border-top-width")).toBe(before.edge);
    await expect.poll(() => style(box, "background-color")).toBe(before.ground);
  });

  test("is still typed in: a press in the input is not a pick", async ({
    page,
  }) => {
    await openPreview(page);
    const input = page.getByRole("textbox", { name: "Email address" });
    await input.scrollIntoViewIfNeeded();
    await input.click();
    await input.fill("me@example.com");
    await expect(input).toHaveValue("me@example.com");
    await expect(page.getByTestId("preview-selection")).toHaveCount(0);
    await expect(
      panel(page).getByRole("heading", { name: "Newsletter field" }),
    ).toHaveCount(0);
  });
});

test.describe("The dividers are lines of their own", () => {
  const footerBase = (page: Page) =>
    page.locator('[data-preview-slot="divider-footer-base"]');

  test("the line above the footer's last row is picked, shown, changed and put back", async ({
    page,
  }) => {
    await openPreview(page);
    const row = footerBase(page);
    await row.scrollIntoViewIfNeeded();
    const own = await style(row, "border-top-width");
    expect(own).not.toBe("0px");

    const area = (await row.boundingBox())!;
    await row.click({ position: { x: area.width / 2, y: 4 } });
    await expect(
      panel(page).getByRole("heading", { name: "Footer divider", level: 2 }),
    ).toBeVisible();
    /* A line and the room around it, and nothing else. */
    for (const name of ["Fill", "Appearance", "Effects", "Typography"]) {
      await expect(section(page, name)).toHaveCount(0);
    }
    await expect(section(page, "Auto layout")).toBeVisible();
    await expect(
      section(page, "Stroke").getByRole("button", {
        name: "Stroke colour",
        exact: true,
      }),
    ).toContainText("Border default");
    await expect(
      section(page, "Stroke").getByLabel("Stroke edge"),
    ).toContainText("Top");

    await choose(section(page, "Stroke"), page, "Stroke weight", "3px");
    await expect.poll(() => style(row, "border-top-width")).toBe("3px");
    expect(await style(row, "border-bottom-width")).toBe("0px");

    await choose(
      section(page, "Stroke"),
      page,
      "Stroke colour",
      "Border strong",
    );
    await expect
      .poll(() => style(row, "border-top-color"))
      .not.toBe("rgba(0, 0, 0, 0)");

    await section(page, "Stroke")
      .getByRole("button", { name: "Remove stroke" })
      .click();
    await expect.poll(() => style(row, "border-top-width")).toBe("0px");

    await panel(page).getByRole("button", { name: "Reset to default" }).click();
    await expect.poll(() => style(row, "border-top-width")).toBe(own);
  });

  test("the nav and the footer bands show their own divider as the stroke", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openPreview(page);
    const nav = page.locator('[data-preview-section="shell-nav"]');
    await nav.click({ position: { x: 6, y: 6 } });
    await expect(
      section(page, "Stroke").getByLabel("Stroke edge"),
    ).toContainText("Bottom");
    const own = await style(nav, "border-bottom-width");
    expect(own).not.toBe("0px");
    await section(page, "Stroke")
      .getByRole("button", { name: "Remove stroke" })
      .click();
    await expect.poll(() => style(nav, "border-bottom-width")).toBe("0px");
    await panel(page).getByRole("button", { name: "Reset to default" }).click();
    await expect.poll(() => style(nav, "border-bottom-width")).toBe(own);

    const foot = page.locator('[data-preview-section="shell-footer"]');
    await foot.scrollIntoViewIfNeeded();
    await foot.click({ position: { x: 6, y: 6 } });
    await expect(
      section(page, "Stroke").getByLabel("Stroke edge"),
    ).toContainText("Top");
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

test.describe("Card groups and plans", () => {
  const cards = (page: Page, id: string) =>
    page.locator(`[data-preview-slot="${id}"]`);

  test("a group of feature cards is picked together and outlined card by card", async ({
    page,
  }) => {
    await openPreview(page);
    const all = cards(page, "card-feature-card");
    const count = await all.count();
    expect(count).toBeGreaterThanOrEqual(3);

    await all.first().click({ position: { x: 60, y: 6 } });
    await expect(
      panel(page).getByRole("heading", { name: "Feature cards", level: 2 }),
    ).toBeVisible();
    await expect(page.getByTestId("preview-selection")).toHaveCount(count);

    /* A surface: room, shape, fill, edge and shadow, and no copy or type. */
    for (const name of [
      "Auto layout",
      "Appearance",
      "Fill",
      "Stroke",
      "Effects",
    ]) {
      await expect(section(page, name)).toBeVisible();
    }
    await expect(section(page, "Typography")).toHaveCount(0);
    await expect(
      panel(page).getByRole("textbox", { name: "Copy" }),
    ).toHaveCount(0);

    /* One radius, and every card of the group takes it. */
    const radius = section(page, "Appearance").getByRole("button", {
      name: "Corner radius",
      exact: true,
    });
    await radius.click();
    await page.getByRole("option").nth(2).click();
    const said = (await radius.innerText()).match(/(\d+)px/);
    expect(said).not.toBeNull();
    for (let index = 0; index < count; index += 1) {
      await expect
        .poll(() => style(all.nth(index), "border-top-left-radius"))
        .toBe(`${said![1]}px`);
    }
  });

  test("a card's own text still picks the text, not the card", async ({
    page,
  }) => {
    await openPreview(page);
    await page.getByRole("heading", { name: "Shared palettes" }).click();
    await expect(
      panel(page).getByRole("textbox", { name: "Copy" }),
    ).toHaveValue("Shared palettes");
    await expect(page.getByTestId("preview-selection")).toHaveCount(1);
  });

  test("the pricing plans are picked together, filled and put back", async ({
    page,
  }) => {
    await openPreview(page);
    const plans = cards(page, "card-pricing");
    /* The featured plan is dressed differently, so it is not of the group. */
    await expect(plans).toHaveCount(2);
    await expect(cards(page, "card-pricing-featured")).toHaveCount(1);
    const before = await style(plans.first(), "background-color");
    const featured = cards(page, "card-pricing-featured");
    const featuredBefore = await style(featured, "background-color");

    await plans.first().click({ position: { x: 60, y: 6 } });
    await expect(
      panel(page).getByRole("heading", { name: "Pricing cards", level: 2 }),
    ).toBeVisible();
    await expect(page.getByTestId("preview-selection")).toHaveCount(2);

    await choose(section(page, "Fill"), page, "Fill", "Surface subtle");
    await expect
      .poll(() => style(plans.first(), "background-color"))
      .not.toBe(before);
    expect(await style(plans.nth(1), "background-color")).toBe(
      await style(plans.first(), "background-color"),
    );
    /* The featured plan keeps its own ground. */
    expect(await style(featured, "background-color")).toBe(featuredBefore);

    await panel(page).getByRole("button", { name: "Reset to default" }).click();
    await expect
      .poll(() => style(plans.first(), "background-color"))
      .toBe(before);
    expect(
      (await readStoredWorkspace(page))?.typography?.previewStyles,
    ).toBeUndefined();
  });
});

test.describe("The featured plan", () => {
  test("is picked on its own, not with the other plans", async ({ page }) => {
    await openPreview(page);
    const featured = page.locator(
      '[data-preview-slot="card-pricing-featured"]',
    );
    await featured.click({ position: { x: 60, y: 6 } });
    await expect(
      panel(page).getByRole("heading", { name: "Featured plan", level: 2 }),
    ).toBeVisible();
    await expect(page.getByTestId("preview-selection")).toHaveCount(1);
  });
});

test.describe("A button's label colour", () => {
  /* A button's colours ease from one to the next: read once they have stopped. */
  const settled = async (button: Locator, property: string) => {
    let last = await style(button, property);
    for (let tries = 0; tries < 20; tries += 1) {
      await button.page().waitForTimeout(150);
      const now = await style(button, property);
      if (now === last) return now;
      last = now;
    }
    return last;
  };

  const labelColour = (page: Page) =>
    section(page, "Fill").getByRole("button", {
      name: "Label colour",
      exact: true,
    });

  test("is offered to a button, and to nothing else", async ({ page }) => {
    await openPreview(page);
    await heroTitle(page).click();
    await expect(labelColour(page)).toHaveCount(0);
    await selectHeroBand(page);
    await expect(labelColour(page)).toHaveCount(0);

    await seeThePreview(page).click();
    await expect(labelColour(page)).toBeVisible();
    /* Nothing chosen: it says it follows the fill, and has nothing to remove. */
    await expect(labelColour(page)).toContainText("Auto");
    await expect(
      section(page, "Fill").getByRole("button", {
        name: "Remove label colour",
      }),
    ).toBeDisabled();
  });

  test("follows the fill until one is chosen, then is that, and goes back when removed", async ({
    page,
  }) => {
    await openPreview(page);
    const button = seeThePreview(page);
    await button.click();

    await choose(section(page, "Fill"), page, "Fill", "Action primary");
    await expect
      .poll(() => style(button, "background-color"))
      .not.toBe("rgba(0, 0, 0, 0)");
    const derived = await settled(button, "color");
    await expect(labelColour(page)).toContainText("Auto");

    /* A token of its own choosing wins over the derived one. */
    await labelColour(page).click();
    await page.getByRole("option").nth(3).click();
    await expect.poll(() => style(button, "color")).not.toBe(derived);
    const chosen = await settled(button, "color");
    await expect(labelColour(page)).not.toContainText("Auto");
    /* The fill is untouched by it. */
    expect(await style(button, "background-color")).not.toBe(
      "rgba(0, 0, 0, 0)",
    );

    /* Saved as a reference, beside the fill. */
    const saved = Object.values(
      (await readStoredWorkspace(page))?.typography?.previewStyles ?? {},
    ) as { fill?: string; labelColor?: string }[];
    expect(saved).toHaveLength(1);
    expect(saved[0]!.fill).toBe("action.primary");
    expect(saved[0]!.labelColor).toMatch(/^[a-z]+\.[\w-]+$/);

    /* Undone, it is the derived one again; redone, the chosen. */
    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
    await page.keyboard.press("Control+z");
    await expect.poll(() => style(button, "color")).toBe(derived);
    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
    await page.keyboard.press("ControlOrMeta+Shift+z");
    await expect.poll(() => style(button, "color")).toBe(chosen);

    /* Removed, the label is handed back to the fill. */
    await section(page, "Fill")
      .getByRole("button", { name: "Remove label colour" })
      .click();
    await expect.poll(() => style(button, "color")).toBe(derived);
    expect(
      Object.values(
        (await readStoredWorkspace(page))?.typography?.previewStyles ?? {},
      ),
    ).toEqual([{ fill: "action.primary" }]);
  });

  test("can be set with no fill, and Reset puts the label back", async ({
    page,
  }) => {
    await openPreview(page);
    const button = seeThePreview(page);
    const before = await style(button, "color");
    const ground = await style(button, "background-color");
    await button.click();

    await labelColour(page).click();
    await page.getByRole("option").nth(3).click();
    await expect.poll(() => style(button, "color")).not.toBe(before);
    /* Only the label moved; the button's own ground is as it was. */
    expect(await style(button, "background-color")).toBe(ground);

    await panel(page).getByRole("button", { name: "Reset to default" }).click();
    await expect.poll(() => style(button, "color")).toBe(before);
    expect(
      (await readStoredWorkspace(page))?.typography?.previewStyles,
    ).toBeUndefined();
  });
});

test.describe("The copy field's label", () => {
  test("is as small as the other labels, and the field is still named Copy", async ({
    page,
  }) => {
    await openPreview(page);
    await heroTitle(page).click();
    const copy = panel(page).getByRole("textbox", { name: "Copy" });
    await expect(copy).toHaveValue(HERO_TITLE);

    const label = panel(page)
      .locator("span", { hasText: /^Copy$/ })
      .first();
    expect(await style(label, "font-size")).toBe("9px");
    expect(await style(label, "font-size")).toBe(
      await style(
        section(page, "Appearance")
          .locator("span", { hasText: /^Opacity$/ })
          .first(),
        "font-size",
      ),
    );
  });
});

test.describe("Taking a value away again", () => {
  /* React warns, in development only, when a style property is removed while a
     shorthand for it is set, and the style then does not come back. The
     production build this suite normally runs against never says so: run it
     with E2E_DEV=1 to see it. */
  test("an edge and a shadow taken away and given back raise no styling warning", async ({
    page,
  }) => {
    const warnings: string[] = [];
    page.on("console", (message) => {
      if (
        message.type() === "error" &&
        /style property|conflicting property/i.test(message.text())
      ) {
        warnings.push(message.text());
      }
    });
    await openPreview(page);

    /* A button: its edge off, a stroke on and off, its shadow off. */
    const ghost = page.getByRole("button", { name: "Open the studio" });
    await ghost.click();
    await section(page, "Stroke")
      .getByRole("button", { name: "Remove stroke" })
      .click();
    await expect.poll(() => style(ghost, "border-top-width")).toBe("0px");
    await section(page, "Stroke")
      .getByRole("button", { name: "Add stroke" })
      .click();
    await expect.poll(() => style(ghost, "box-shadow")).toMatch(/inset/);
    await panel(page).getByRole("button", { name: "Reset to default" }).click();
    await expect.poll(() => style(ghost, "border-top-width")).not.toBe("0px");

    const solid = seeThePreview(page);
    await solid.click();
    await section(page, "Effects")
      .getByRole("button", { name: "Remove effect" })
      .click();
    await expect.poll(() => style(solid, "box-shadow")).toBe("none");

    /* A divider: the one edge set, changed and taken away. */
    const row = page.locator('[data-preview-slot="divider-footer-base"]');
    await row.scrollIntoViewIfNeeded();
    const area = (await row.boundingBox())!;
    await row.click({ position: { x: area.width / 2, y: 4 } });
    await choose(section(page, "Stroke"), page, "Stroke weight", "3px");
    await expect.poll(() => style(row, "border-top-width")).toBe("3px");
    await section(page, "Stroke")
      .getByRole("button", { name: "Remove stroke" })
      .click();
    await expect.poll(() => style(row, "border-top-width")).toBe("0px");
    await panel(page).getByRole("button", { name: "Reset to default" }).click();
    await expect.poll(() => style(row, "border-top-width")).toBe("1px");

    expect(warnings).toEqual([]);
  });

  test("a fill, a padding and a radius come off without a styling warning", async ({
    page,
  }) => {
    const warnings: string[] = [];
    page.on("console", (message) => {
      if (
        message.type() === "error" &&
        /style property|conflicting property/i.test(message.text())
      ) {
        warnings.push(message.text());
      }
    });
    await openPreview(page);
    const button = seeThePreview(page);
    const own = {
      background: await style(button, "background-color"),
      padding: await style(button, "padding-left"),
    };
    await button.click();

    await choose(section(page, "Fill"), page, "Fill", "Surface raised");
    await expect
      .poll(() => style(button, "background-color"))
      .not.toBe(own.background);
    await section(page, "Fill")
      .getByRole("button", { name: "Remove fill" })
      .click();
    await expect
      .poll(() => style(button, "background-color"))
      .toBe(own.background);

    await choose(
      section(page, "Auto layout"),
      page,
      "Padding horizontal",
      "64px",
    );
    await expect
      .poll(() => style(button, "padding-left"))
      .not.toBe(own.padding);
    /* Astryx ignores a press on a trigger for a beat after its list closes. */
    await page.waitForTimeout(400);
    await choose(
      section(page, "Auto layout"),
      page,
      "Padding horizontal",
      "Default",
    );
    await expect.poll(() => style(button, "padding-left")).toBe(own.padding);

    await choose(section(page, "Appearance"), page, "Corner radius", /px/);
    await page.waitForTimeout(400);
    await choose(section(page, "Appearance"), page, "Corner radius", "Default");

    expect(warnings).toEqual([]);
  });
});

test.describe("On a phone", () => {
  test("a selection opens the panel as a sheet, and a change reaches the page", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openPreview(page);
    /* No column and no bar button: the sheet is the only way in. */
    await expect(
      page.getByRole("button", { name: "Show inspector" }),
    ).toBeHidden();

    const title = heroTitle(page);
    await title.click();
    const sheet = page.getByRole("dialog", { name: "Inspect" });
    await expect(sheet).toBeVisible();
    await expect(panel(page)).toBeVisible();

    const opacity = sheet
      .getByRole("region", { name: "Appearance", exact: true })
      .getByRole("textbox", { name: "Opacity" });
    await opacity.fill("50");
    await opacity.press("Enter");
    await expect.poll(() => style(title, "opacity")).toBe("0.5");

    /* A token list is a sheet over the sheet, as everywhere on a phone. */
    await sheet.getByRole("button", { name: "Type role" }).click();
    await expect(page.getByRole("dialog", { name: "Type role" })).toBeVisible();
  });
});
