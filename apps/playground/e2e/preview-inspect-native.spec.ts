import type { Page } from "@playwright/test";
import { expect, readStoredWorkspace, test } from "./fixtures";
import { openPreview } from "./preview-fixtures";
import {
  panel,
  section,
  seeThePreview,
  style,
  choose,
} from "./preview-inspect-fixtures";

/**
 * What the page is drawn with, as the panel shows it, and the parts of the
 * page that can be picked: edges and shadows, the lists' Default numbers, the
 * chip, the newsletter field, the dividers, the card groups.
 */

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

test.describe("A list says what is chosen, and what Default comes to", () => {
  const px = (value: string) =>
    `${Math.round(parseFloat(value) * 100) / 100}px`;

  test("the chosen row is marked by its wash and weight, with no check mark", async ({
    page,
  }) => {
    await openPreview(page);
    await seeThePreview(page).click();
    await choose(
      section(page, "Auto layout"),
      page,
      "Padding horizontal",
      "64px",
    );
    await page.waitForTimeout(400);
    await section(page, "Auto layout")
      .getByRole("button", { name: "Padding horizontal", exact: true })
      .click();
    const chosen = page.getByRole("option", { selected: true });
    await expect(chosen).toHaveCount(1);
    await expect(chosen).toContainText("64px");
    expect(await style(chosen, "font-weight")).toBe("600");
    /* Nothing but the name and the number: no icon in the row. */
    await expect(page.getByRole("option").locator("svg")).toHaveCount(0);
  });

  test("Default has the number the page draws, before and after it is changed", async ({
    page,
  }) => {
    await openPreview(page);
    const button = seeThePreview(page);
    const own = px(await style(button, "padding-left"));
    await button.click();

    const field = section(page, "Auto layout").getByRole("button", {
      name: "Padding horizontal",
      exact: true,
    });
    /* Said on the control while nothing is set. */
    await expect(field).toContainText("Default");
    await expect(field).toContainText(own);

    await field.click();
    const row = page.getByRole("option", { name: /^Default/ });
    await expect(row).toContainText(own);
    await page.getByRole("option").filter({ hasText: "64px" }).first().click();
    await expect.poll(() => style(button, "padding-left")).toBe("64px");

    /* The number is what it was, not what it was changed to, also when the
       element is picked again with its change already on it. */
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("preview-selection")).toHaveCount(0);
    await button.click();
    await page.waitForTimeout(400);
    await field.click();
    await expect(page.getByRole("option", { name: /^Default/ })).toContainText(
      own,
    );
    await expect(
      page.getByRole("option", { name: /^Default/ }),
    ).not.toContainText("64px");
  });

  test("a card picked again with a padding already on it still says what Default is", async ({
    page,
  }) => {
    await openPreview(page);
    const card = page
      .locator('[data-preview-slot="card-feature-card"]')
      .first();
    const own = px(await style(card, "padding-left"));
    await card.click({ position: { x: 60, y: 6 } });
    await choose(
      section(page, "Auto layout"),
      page,
      "Padding horizontal",
      "64px",
    );
    await expect.poll(() => style(card, "padding-left")).toBe("64px");

    await page.keyboard.press("Escape");
    await expect(page.getByTestId("preview-selection")).toHaveCount(0);
    await card.click({ position: { x: 60, y: 6 } });
    await page.waitForTimeout(400);
    await section(page, "Auto layout")
      .getByRole("button", { name: "Padding horizontal", exact: true })
      .click();
    const row = page.getByRole("option", { name: /^Default/ });
    await expect(row).toContainText(own);
    await expect(row).not.toContainText("64px");
  });

  test("Default has the number for a gap and for a radius", async ({
    page,
  }) => {
    await openPreview(page);
    const card = page
      .locator('[data-preview-slot="card-feature-card"]')
      .first();
    const radius = px(await style(card, "border-top-left-radius"));
    const gap = px(await style(card, "row-gap"));
    await card.click({ position: { x: 60, y: 6 } });

    await expect(
      section(page, "Appearance").getByRole("button", {
        name: "Corner radius",
        exact: true,
      }),
    ).toContainText(radius);
    if (gap !== "NaNpx") {
      await expect(
        section(page, "Auto layout").getByRole("button", {
          name: "Gap",
          exact: true,
        }),
      ).toContainText(gap);
    }
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
