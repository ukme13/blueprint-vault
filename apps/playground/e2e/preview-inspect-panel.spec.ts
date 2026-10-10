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
    /* Stroke and effects start empty, each with a Plus. */
    await expect(
      section(page, "Stroke").getByRole("button", { name: "Add stroke" }),
    ).toBeVisible();
    await expect(
      section(page, "Effects").getByRole("button", { name: "Add effect" }),
    ).toBeVisible();
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

    /* A shadow joins the stroke in the one box-shadow. */
    await section(page, "Effects")
      .getByRole("button", { name: "Add effect" })
      .click();
    await expect(
      section(page, "Effects").getByRole("button", {
        name: "Shadow",
        exact: true,
      }),
    ).toBeVisible();
    await expect
      .poll(
        async () =>
          ((await style(button, "box-shadow")) as string).split("rgba").length,
      )
      .toBeGreaterThan(1);

    await section(page, "Effects")
      .getByRole("button", { name: "Remove effect" })
      .click();
    await stroke.getByRole("button", { name: "Remove stroke" }).click();
    await expect.poll(() => style(button, "box-shadow")).toBe(own);
    await expect(
      section(page, "Stroke").getByRole("button", { name: "Add stroke" }),
    ).toBeVisible();
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

test.describe("Taking a value away again", () => {
  /* React warns, in development only, when a style property is removed while a
     shorthand for it is set, and the style then does not come back. The
     production build this suite normally runs against never says so: run it
     with E2E_DEV=1 to see it. */
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
