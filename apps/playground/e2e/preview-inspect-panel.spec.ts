import { expect, test } from "./fixtures";
import { openPreview } from "./preview-fixtures";
import {
  edgeShown,
  HERO_TITLE,
  panel,
  section,
  heroTitle,
  seeThePreview,
  style,
  choose,
  selectHeroBand,
} from "./preview-inspect-fixtures";

/**
 * The inspect panel on /preview: a Figma-style column beside the page, in
 * place of the dialogs it replaced. Where it sits, what each kind of element
 * offers, its labels, taking a value away, and the phone's sheet.
 */

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

  test("band: padding, opacity, radius, fill, stroke and effects; no gap, copy or type", async ({
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
    /* A band has nothing in it to put a space between: no Gap to set. */
    await expect(
      section(page, "Auto layout").getByRole("button", {
        name: "Gap",
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(
      section(page, "Auto layout").getByRole("button", {
        name: "Padding vertical",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      section(page, "Appearance").getByRole("textbox", { name: "Opacity" }),
    ).toBeVisible();
  });

  test("a card keeps its gap, which does space what is in it", async ({
    page,
  }) => {
    await openPreview(page);
    const card = page
      .locator('[data-preview-slot="card-feature-card"]')
      .first();
    await card.click({ position: { x: 60, y: 6 } });
    await choose(section(page, "Auto layout"), page, "Gap", "64px");
    await expect.poll(() => style(card, "row-gap")).toBe("64px");
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
    await expect.poll(() => edgeShown(ghost)).toBe(false);
    await section(page, "Stroke")
      .getByRole("button", { name: "Add stroke" })
      .click();
    await expect.poll(() => style(ghost, "outline-style")).toBe("solid");
    await panel(page).getByRole("button", { name: "Reset to default" }).click();
    await expect.poll(() => edgeShown(ghost)).toBe(true);

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
    await expect.poll(() => edgeShown(row)).toBe(false);
    await panel(page).getByRole("button", { name: "Reset to default" }).click();
    await expect.poll(() => edgeShown(row)).toBe(true);

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
