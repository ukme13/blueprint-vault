import type { Page } from "@playwright/test";
import { expect, openTheme, test } from "./fixtures";

/**
 * The accessibility sandbox: a hero whose layers are selected like Figma's,
 * recoloured from a role or a shade, and read by a card in the corner in the
 * standard chosen on the toolbar. The rules behind the figures are Vitest's;
 * these are the interactions.
 */
const sandbox = (page: Page) =>
  page.getByRole("region", { name: "Accessibility sandbox", exact: true });
const layer = (page: Page, name: string) =>
  sandbox(page).locator(`[data-sandbox-target="${name}"]`);
const controlBar = (page: Page) => sandbox(page).locator("header");
const card = (page: Page, standard: string, target: string) =>
  sandbox(page).getByRole("complementary", {
    name: `${standard} contrast for ${target}`,
    exact: true,
  });
const standardToggle = (page: Page) =>
  page.getByRole("group", { name: "Accessibility standard", exact: true });
const standardButton = (page: Page, name: "WCAG 2" | "WCAG 3") =>
  standardToggle(page).getByRole("button", { name, exact: true });

const colourOf = (page: Page, name: string) =>
  layer(page, name).evaluate((el) => getComputedStyle(el).color);

const openAccessibility = async (page: Page) => {
  await page.getByRole("button", { name: "Accessibility" }).click();
  await expect(sandbox(page)).toBeVisible();
};

test.describe("The accessibility sandbox", () => {
  test("opens on the four layers with the background selected", async ({
    seededPage: page,
  }) => {
    await openAccessibility(page);

    await expect(layer(page, "badgeFill")).toContainText("Accessibility");
    await expect(layer(page, "heading")).toHaveText("WCAG 2.2");
    await expect(layer(page, "body")).toContainText(
      "Web Content Accessibility Guidelines",
    );
    await expect(layer(page, "buttonFill")).toContainText("Primary");

    /* The background is what is held at first, so the bar is never empty. The
       hero is the background, so it has no outline of its own to draw. */
    await expect(controlBar(page)).toContainText("Background");
    await expect(page.getByTestId("sandbox-selection")).toHaveCount(0);
    await expect(card(page, "WCAG 2", "Background")).toBeVisible();
  });

  test("runs edge to edge under the control bar, as designed", async ({
    seededPage: page,
  }) => {
    await openAccessibility(page);

    const hero = (await layer(page, "background").boundingBox())!;
    const bar = (await controlBar(page).boundingBox())!;
    const viewport = page.viewportSize()!;
    /* From the bar's left edge to the window's right, with no card around it. */
    expect(hero.x).toBeCloseTo(bar.x, 0);
    expect(hero.width).toBeCloseTo(bar.width, 0);
    expect(hero.x + hero.width).toBeLessThanOrEqual(viewport.width);
    expect(hero.y).toBeCloseTo(bar.y + bar.height, 0);
    expect(hero.height).toBeGreaterThanOrEqual(560);
    expect(
      await layer(page, "background").evaluate(
        (el) => getComputedStyle(el).borderRadius,
      ),
    ).toBe("0px");

    /* Its content is centred. */
    const heading = (await layer(page, "heading").boundingBox())!;
    expect(heading.x + heading.width / 2).toBeCloseTo(
      hero.x + hero.width / 2,
      -1,
    );
  });

  test("says WCAG 3 in the hero under WCAG 3", async ({ seededPage: page }) => {
    await openAccessibility(page);
    await standardButton(page, "WCAG 3").click();

    await expect(layer(page, "heading")).toHaveText("WCAG 3");
    await expect(layer(page, "body")).toContainText("APCA");
  });

  test("selects a layer with an outline, corner handles and a size tag", async ({
    seededPage: page,
  }) => {
    await openAccessibility(page);
    await layer(page, "heading").click();

    await expect(layer(page, "heading")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(controlBar(page)).toContainText("Heading Text");

    const outline = page.getByTestId("sandbox-selection");
    await expect(outline).toBeVisible();
    await expect(outline.locator("i")).toHaveCount(4);
    await expect(outline.locator("small")).toHaveText(
      /^\d+ × \d+ · Fill × Hug$/,
    );

    /* The outline sits over the layer it names, to the pixel. */
    const layerBox = (await layer(page, "heading").boundingBox())!;
    const outlineBox = (await outline.boundingBox())!;
    expect(outlineBox.x).toBeCloseTo(layerBox.x, 0);
    expect(outlineBox.y).toBeCloseTo(layerBox.y, 0);
    expect(outlineBox.width).toBeCloseTo(layerBox.width, 0);
    expect(outlineBox.height).toBeCloseTo(layerBox.height, 0);
  });

  test("selects the canvas, and goes into a container for its text", async ({
    seededPage: page,
  }) => {
    await openAccessibility(page);

    await layer(page, "background").click({ position: { x: 4, y: 4 } });
    await expect(controlBar(page)).toContainText("Background");

    /* A plain click on a button takes its fill. */
    await layer(page, "buttonFill").click();
    await expect(controlBar(page)).toContainText("Button Fill");

    /* Ctrl click goes in for the text. */
    await layer(page, "buttonText").click({ modifiers: ["Control"] });
    await expect(controlBar(page)).toContainText("Button Text");

    /* So does a double click, on the badge. */
    await layer(page, "badgeText").dblclick();
    await expect(controlBar(page)).toContainText("Badge Text");

    await layer(page, "badgeFill").click();
    await expect(controlBar(page)).toContainText("Badge Fill");
  });

  test("selects from the keyboard, and Escape lets go", async ({
    seededPage: page,
  }) => {
    await openAccessibility(page);
    await layer(page, "body").focus();
    await page.keyboard.press("Enter");
    await expect(controlBar(page)).toContainText("Body Text");

    await layer(page, "buttonFill").focus();
    await page.keyboard.press("Control+Enter");
    await expect(controlBar(page)).toContainText("Button Text");

    await page.keyboard.press("Escape");
    await expect(page.getByTestId("sandbox-selection")).toHaveCount(0);
    await expect(controlBar(page)).toContainText("Select a layer");
  });

  test("clicking the hero around its layers selects the background", async ({
    seededPage: page,
  }) => {
    await openAccessibility(page);
    await layer(page, "body").click();
    await expect(page.getByTestId("sandbox-selection")).toBeVisible();

    await layer(page, "background").click({ position: { x: 8, y: 8 } });
    await expect(controlBar(page)).toContainText("Background");
    await expect(page.getByTestId("sandbox-selection")).toHaveCount(0);
  });

  test("recolours a layer from a role, or from a shade", async ({
    seededPage: page,
  }) => {
    await openAccessibility(page);
    await layer(page, "body").click();
    const before = await colourOf(page, "body");

    /* The role tab opens for a layer that holds a role. */
    await controlBar(page)
      .getByRole("button", { name: /^Body Text colour:/ })
      .click();
    const list = page.getByRole("dialog", { name: "Body Text colour" });
    await expect(list.getByRole("tab", { name: "Semantic" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await list
      .getByRole("option", { name: /fg\.primary|Foreground primary/i })
      .first()
      .click();
    await expect.poll(() => colourOf(page, "body")).not.toBe(before);
    await expect(list).toHaveCount(0);
    /* Astryx ignores a press on the trigger for a beat after it closes. */
    await page.waitForTimeout(400);

    /* A shade, found by typing. */
    await controlBar(page)
      .getByRole("button", { name: /^Body Text colour:/ })
      .click();
    await list.getByRole("tab", { name: "Primitive" }).click();
    await list.getByRole("searchbox").fill("primary 950");
    await list.getByRole("option", { name: "primary 950" }).click();

    await expect(
      controlBar(page).getByRole("button", {
        name: "Body Text colour: primary 950",
      }),
    ).toBeVisible();
  });

  test("moves along the shade ramp, outlining the one held", async ({
    seededPage: page,
  }) => {
    await openAccessibility(page);
    await layer(page, "heading").click();

    const ramp = controlBar(page).getByRole("group", {
      name: /shades for Heading Text/,
    });
    const steps = ramp.getByRole("button");
    expect(await steps.count()).toBeGreaterThan(10);
    await expect(ramp.locator('[aria-pressed="true"]')).toHaveCount(1);

    /* Each step is labelled with its weight, first to last. */
    const labels = await steps.allInnerTexts();
    expect(labels[0]).toBe("25");
    expect(labels.at(-1)).toBe("950");
    expect(labels.map(Number)).toEqual(
      [...labels.map(Number)].sort((a, b) => a - b),
    );

    /* One strip, 28px tall, the ends rounded and the one held outlined. */
    expect((await ramp.boundingBox())!.height).toBe(28);
    expect(
      await steps
        .first()
        .evaluate((el) => getComputedStyle(el).borderTopLeftRadius),
    ).toBe("8px");
    expect(
      await ramp
        .locator('[aria-pressed="true"]')
        .evaluate((el) => getComputedStyle(el).boxShadow),
    ).not.toBe("none");

    await ramp.getByRole("button", { name: /^\S+ 50$/ }).click();
    await expect(
      ramp.getByRole("button", { name: /^\S+ 50$/ }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(ramp.locator('[aria-pressed="true"]')).toHaveCount(1);
    await expect(
      controlBar(page).getByRole("button", {
        name: /^Heading Text colour: \S+ 50$/,
      }),
    ).toBeVisible();
  });

  test("a role follows the theme and a shade does not", async ({
    seededPage: page,
  }) => {
    await openAccessibility(page);
    await layer(page, "buttonFill").click();
    await layer(page, "heading").click();
    await layer(page, "body").click();
    /* Pin the body to a shade; the heading stays on its role. */
    const ramp = controlBar(page).getByRole("group", {
      name: /shades for Body Text/,
    });
    await ramp.getByRole("button", { name: /^\S+ 500$/ }).click();

    const theme = await openTheme(page);
    await theme.getByRole("radio", { name: "Light" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    const headingLight = await colourOf(page, "heading");
    const bodyLight = await colourOf(page, "body");

    const dark = await openTheme(page);
    await dark.getByRole("radio", { name: "Dark" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await expect.poll(() => colourOf(page, "heading")).not.toBe(headingLight);
    expect(await colourOf(page, "body")).toBe(bodyLight);
  });
});

test.describe("The contrast card", () => {
  test("floats over the hero's top left on a wide screen", async ({
    seededPage: page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openAccessibility(page);
    await layer(page, "body").click();

    const hud = card(page, "WCAG 2", "Body Text");
    const card_ = (await hud.boundingBox())!;
    const hero = (await layer(page, "background").boundingBox())!;
    expect(await hud.evaluate((el) => getComputedStyle(el).position)).toBe(
      "absolute",
    );
    /* Inside the hero, near its top left, and not as wide as it. */
    expect(card_.x - hero.x).toBeCloseTo(12, 0);
    expect(card_.y - hero.y).toBeCloseTo(12, 0);
    expect(card_.width).toBeLessThan(hero.width / 2);
    await expect(hud).toContainText("WCAG 2 contrast");
    await expect(hud).toContainText("Body Text");
  });

  test("is one strip the sandbox's width under the hero on a phone", async ({
    seededPage: page,
  }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await openAccessibility(page);
    await layer(page, "body").click();

    const hud = card(page, "WCAG 2", "Body Text");
    const strip = (await hud.boundingBox())!;
    const hero = (await layer(page, "background").boundingBox())!;
    const box = (await sandbox(page).boundingBox())!;
    expect(strip.width).toBeCloseTo(box.width, 0);
    expect(strip.x).toBeCloseTo(box.x, 0);
    /* Below the hero's bottom edge, so nothing of the hero is covered. */
    expect(strip.y).toBeGreaterThanOrEqual(hero.y + hero.height - 1);
    expect(await hud.evaluate((el) => getComputedStyle(el).position)).toBe(
      "static",
    );
  });

  test("reads the pair in WCAG 2 as ratios with a grade", async ({
    seededPage: page,
  }) => {
    await openAccessibility(page);
    await layer(page, "body").click();

    const hud = card(page, "WCAG 2", "Body Text");
    await expect(hud).toBeVisible();
    await expect(hud).toContainText("Text on Fill");
    await expect(hud).toContainText("Fill on Page");
    await expect(hud).toContainText(/\d+\.\d:1/);
    await expect(hud).toContainText(/(AAA|AA) Pass|Fail|Advisory/);
  });

  test("turns into Lc and Pass or Fail under WCAG 3", async ({
    seededPage: page,
  }) => {
    await openAccessibility(page);
    await layer(page, "body").click();
    await standardButton(page, "WCAG 3").click();

    const hud = card(page, "WCAG 3", "Body Text");
    await expect(hud).toBeVisible();
    await expect(hud).toContainText(/Lc \d+/);
    await expect(hud).not.toContainText(":1");
  });

  test("fails text that is the colour of its fill, and says so in both standards", async ({
    seededPage: page,
  }) => {
    await openAccessibility(page);
    await layer(page, "body").click();

    /* Body text set to the canvas's own role: nothing to read. */
    await controlBar(page)
      .getByRole("button", { name: /^Body Text colour:/ })
      .click();
    const list = page.getByRole("dialog", { name: "Body Text colour" });
    await list.getByRole("searchbox").fill("surface");
    await list
      .getByRole("option", { name: /Surface subtle|surface\.subtle/i })
      .first()
      .click();

    await expect(card(page, "WCAG 2", "Body Text")).toContainText("Fail");
    await standardButton(page, "WCAG 3").click();
    await expect(card(page, "WCAG 3", "Body Text")).toContainText("Fail");
  });

  test("gives a canvas against its page as advisory, not a verdict", async ({
    seededPage: page,
  }) => {
    await openAccessibility(page);
    await layer(page, "background").click({ position: { x: 4, y: 4 } });

    const hud = card(page, "WCAG 2", "Background");
    await expect(hud).toContainText("Advisory");
    await expect(hud.locator("li").nth(1).locator("svg")).toHaveCount(0);
  });

  test("shows the same figure as the sandbox when the view is simulated", async ({
    seededPage: page,
  }) => {
    await openAccessibility(page);
    await layer(page, "body").click();
    const hud = card(page, "WCAG 2", "Body Text");
    const before = await hud.innerText();

    /* Vision repaints the swatches but must not change what is measured. */
    await page
      .getByRole("button", { name: /^Vision/ })
      .first()
      .click();
    await expect(hud).toBeVisible();
    expect(await hud.innerText()).toBe(before);
  });
});

test.describe("The standard toggle", () => {
  test("is on the Accessibility tab only, ahead of Vision", async ({
    seededPage: page,
  }) => {
    await expect(standardToggle(page)).toHaveCount(0);

    await openAccessibility(page);
    await expect(standardToggle(page)).toBeVisible();
    await expect(standardToggle(page).getByRole("button")).toHaveText([
      "WCAG 2",
      "WCAG 3",
    ]);

    const toggle = (await standardToggle(page).boundingBox())!;
    const vision = (await page
      .getByRole("button", { name: /^Vision/ })
      .first()
      .boundingBox())!;
    expect(toggle.x + toggle.width).toBeLessThanOrEqual(vision.x + 1);
    /* Both are 28px tall, on the same line. */
    const button = (await standardButton(page, "WCAG 2").boundingBox())!;
    expect(button.height).toBe(28);
    expect(Math.abs(button.y - vision.y)).toBeLessThan(1);
  });

  test("lights the one in use and always has one lit", async ({
    seededPage: page,
  }) => {
    await openAccessibility(page);
    await expect(standardButton(page, "WCAG 2")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(standardButton(page, "WCAG 3")).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    await standardButton(page, "WCAG 3").click();
    await expect(standardButton(page, "WCAG 3")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(standardButton(page, "WCAG 2")).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    /* Pressing the lit one is not an off switch. */
    await standardButton(page, "WCAG 3").click();
    await expect(standardButton(page, "WCAG 3")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("changes the detailed report below the hero as well", async ({
    seededPage: page,
  }) => {
    await openAccessibility(page);
    const primaryAction = page
      .getByText("Primary action text", { exact: true })
      .locator("../..");
    await expect(primaryAction).toContainText(/\d+\.\d:1/);

    await standardButton(page, "WCAG 3").click();
    await expect(primaryAction).toContainText(/Lc \d+/);
    await expect(primaryAction).toContainText(/Body|Large|UI|Fail/);
    await expect(primaryAction).not.toContainText(":1");

    const focus = page
      .getByText("Keyboard focus colour", { exact: true })
      .locator("../..");
    await expect(focus).toContainText(/Lc \d+/);

    await standardButton(page, "WCAG 2").click();
    await expect(primaryAction).toContainText(/\d+\.\d:1/);
  });

  test("keeps the standard the Contrast tool uses", async ({
    seededPage: page,
  }) => {
    await openAccessibility(page);
    await standardButton(page, "WCAG 3").click();

    await page.getByRole("button", { name: "Shade generator" }).click();
    const group = page.getByRole("group", { name: "Contrast", exact: true });
    await group.getByRole("button", { name: "Contrast", exact: true }).click();
    await expect(
      group.getByRole("button", { name: "WCAG 3", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  test("stays inside the viewport on a phone", async ({ seededPage: page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openAccessibility(page);
    await layer(page, "heading").click();

    await expect(card(page, "WCAG 2", "Heading Text")).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("keeps the colour picker in reach on a phone, and opens it as a sheet", async ({
    seededPage: page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openAccessibility(page);
    await layer(page, "body").click();

    /* The bar scrolls sideways beside the ramp; the trigger must not be the
       thing that gives way. */
    const trigger = controlBar(page).getByRole("button", {
      name: /^Body Text colour:/,
    });
    await expect(trigger).toBeVisible();
    const triggerBox = (await trigger.boundingBox())!;
    const barBox = (await controlBar(page).boundingBox())!;
    expect(triggerBox.width).toBeGreaterThan(60);
    expect(triggerBox.x).toBeGreaterThanOrEqual(barBox.x);
    expect(triggerBox.x + triggerBox.width).toBeLessThanOrEqual(
      barBox.x + barBox.width,
    );

    /* No long ramp on a phone: the target on the left, its colour on the
       right, and the bar does not scroll. */
    await expect(
      controlBar(page).getByRole("group", { name: /shades for/ }),
    ).toHaveCount(0);
    const label = (await controlBar(page).locator("strong").boundingBox())!;
    expect(label.x - barBox.x).toBeLessThan(24);
    expect(
      barBox.x + barBox.width - (triggerBox.x + triggerBox.width),
    ).toBeLessThan(24);
    expect(
      await controlBar(page).evaluate((el) => el.scrollWidth - el.clientWidth),
    ).toBeLessThanOrEqual(0);

    const before = await colourOf(page, "body");
    await trigger.click();
    const sheet = page.getByRole("dialog", { name: "Body Text colour" });
    /* The title and both tabs are in view, and stay there as the list scrolls. */
    await expect(
      sheet.getByRole("heading", { name: "Body Text colour" }),
    ).toBeVisible();
    await expect(sheet.getByRole("tab", { name: "Semantic" })).toBeVisible();
    await expect(sheet.getByRole("tab", { name: "Primitive" })).toBeVisible();

    /* At the top of the list, the first group's title is clear of the held
       head and not cut off under it. (The list opens centred on the colour
       held, so it is scrolled there first.) */
    await sheet.getByRole("listbox").evaluate((list) => {
      for (let node = list.parentElement; node; node = node.parentElement) {
        if (node.scrollHeight > node.clientHeight) node.scrollTop = 0;
      }
    });
    const head = (await sheet.locator("[class*='stickyHead']").boundingBox())!;
    const groupTitle = sheet.locator("[class*='groupTitle']").first();
    await expect(groupTitle).toHaveText("Actions");
    await expect
      .poll(async () => (await groupTitle.boundingBox())!.y)
      .toBeGreaterThanOrEqual(head.y + head.height);

    await sheet.getByRole("tab", { name: "Primitive" }).click();
    await expect(
      sheet.getByRole("option", { name: "primary 25", exact: true }),
    ).toBeVisible();
    /* Scrolled to the end of a long list, the tabs are still in view. */
    await sheet.getByRole("option").last().scrollIntoViewIfNeeded();
    await expect(
      sheet.getByRole("tab", { name: "Primitive" }),
    ).toBeInViewport();
    await sheet.getByRole("tab", { name: "Semantic" }).click();
    await sheet
      .getByRole("option", { name: /fg\.primary|Foreground primary/i })
      .first()
      .click();
    await expect.poll(() => colourOf(page, "body")).not.toBe(before);
  });

  test("goes into a button for its text with a second tap, and back out with a third", async ({
    seededPage: page,
  }) => {
    /* A finger has no Ctrl and a double tap zooms, so a tap on a container
       already held goes in. */
    await page.setViewportSize({ width: 390, height: 844 });
    await openAccessibility(page);

    await layer(page, "buttonFill").click();
    await expect(controlBar(page)).toContainText("Button Fill");
    await layer(page, "buttonFill").click();
    await expect(controlBar(page)).toContainText("Button Text");
    await expect(card(page, "WCAG 2", "Button Text")).toBeVisible();
    await layer(page, "buttonFill").click();
    await expect(controlBar(page)).toContainText("Button Fill");

    /* The badge, the same. A heading has no text of its own to go into. */
    await layer(page, "badgeFill").click();
    await layer(page, "badgeFill").click();
    await expect(controlBar(page)).toContainText("Badge Text");
    await layer(page, "heading").click();
    await layer(page, "heading").click();
    await expect(controlBar(page)).toContainText("Heading Text");
  });
});
