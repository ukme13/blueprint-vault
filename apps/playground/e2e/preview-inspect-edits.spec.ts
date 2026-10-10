import type { Locator, Page } from "@playwright/test";
import { expect, readStoredWorkspace, test } from "./fixtures";
import { openPreview } from "./preview-fixtures";
import {
  panel,
  section,
  heroTitle,
  seeThePreview,
  heroBand,
  style,
  choose,
  selectHeroBand,
} from "./preview-inspect-fixtures";

/**
 * What the inspect panel changes: a token redraws the page, a change is kept
 * with the project and can be taken back, and a button's label colour.
 */

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

  test("a band's padding and opacity", async ({ page }) => {
    await openPreview(page);
    const band = heroBand(page);
    await selectHeroBand(page);

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
    await choose(
      section(page, "Auto layout"),
      page,
      "Padding vertical",
      "64px",
    );

    await expect
      .poll(async () => {
        const workspace = await readStoredWorkspace(page);
        return workspace?.typography?.previewStyles ?? null;
      })
      .toMatchObject({ [id!]: { opacity: 40 } });
    const stored = (await readStoredWorkspace(page))!.typography!
      .previewStyles as Record<string, Record<string, unknown>>;
    /* The band is under its own key, and its padding is a step, not a length. */
    const padding = stored["band:landing-hero"]?.padding as
      { top?: unknown } | undefined;
    expect(typeof padding?.top).toBe("number");

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
