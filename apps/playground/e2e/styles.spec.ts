import { expect, test, type Locator, type Page } from "@playwright/test";
import { PROJECT_STORAGE_KEY, defaultProject } from "./fixtures";
import {
  TYPOGRAPHY_STORAGE_KEY,
  defaultTypographyProject,
} from "./typography-fixtures";
import { showInspectorPanel } from "./typography-fixtures";

/**
 * Computed-style coverage for the rules nothing else asserts.
 *
 * A stylesheet that fails to parse is caught by the build, but only because a
 * missing brace happens to be a syntax error. A merge that produces valid CSS
 * with the wrong meaning ships silently — which is roughly what happened when
 * two branches both appended to the end of this stylesheet and the resolution
 * swallowed a rule. These read what the browser computed, so a rule that stops
 * applying fails here rather than being noticed by eye later.
 */

const styleOf = (locator: Locator, property: string) =>
  locator.evaluate(
    (el, prop) => getComputedStyle(el).getPropertyValue(prop),
    property,
  );

async function seed(page: Page) {
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
}

test.describe("Typography studio styles", () => {
  test("the two add buttons are one size, and not the width of the panel", async ({
    page,
  }) => {
    await seed(page);
    const settings = page.getByRole("region", { name: "Type scale settings" });
    await expect(settings).toBeVisible();

    /* One button per panel now, so each is measured where it lives. They are
       still the same class and the point is still that they match. */
    const addFont = settings.getByRole("button", { name: "Add font" });
    const addGroup = settings.getByRole("button", { name: "Add group" });

    const font = await addFont.boundingBox();
    await showInspectorPanel(page, "Groups");
    const group = await addGroup.boundingBox();
    expect(font).not.toBeNull();
    // Same size as each other, which is the whole point of the shared class.
    expect(font!.width).toBe(group!.width);
    expect(font!.height).toBe(group!.height);

    // Fixed rather than stretched: the panel is far wider than this.
    const panel = (await settings.boundingBox())!;
    expect(font!.width).toBeLessThan(panel.width / 2);
  });

  test("the add buttons take the width once the panel is narrow", async ({
    page,
  }) => {
    await seed(page);
    const settings = page.getByRole("region", { name: "Type scale settings" });
    await expect(settings).toBeVisible();

    await page.setViewportSize({ width: 320, height: 900 });
    const addFont = settings.getByRole("button", { name: "Add font" });
    const addGroup = settings.getByRole("button", { name: "Add group" });

    const panel = (await settings.boundingBox())!;
    const font = (await addFont.boundingBox())!;
    await showInspectorPanel(page, "Groups");
    const group = (await addGroup.boundingBox())!;

    expect(font.width).toBe(group.width);
    // Full width of the group's content box, whatever the padding happens to be.
    expect(font.width).toBeGreaterThan(panel.width * 0.8);
  });

  test("the inspector never scrolls sideways", async ({ page }) => {
    await seed(page);
    const settings = page.getByRole("region", { name: "Type scale settings" });
    await expect(settings).toBeVisible();

    /* An implicit auto column sized to its widest child once pushed this past
       the panel, and everything measured against it followed. */
    for (const width of [900, 500, 360, 320]) {
      await page.setViewportSize({ width, height: 900 });
      const overflow = await settings.evaluate(
        (el) => el.scrollWidth - el.clientWidth,
      );
      expect(overflow, `no sideways scroll at ${width}px`).toBeLessThanOrEqual(
        1,
      );
    }
  });

  test("a picked preview background reaches the text, not just the stage", async ({
    page,
  }) => {
    await seed(page);
    await page.getByRole("button", { name: "Preview", exact: true }).click();
    const preview = page.getByRole("region", { name: "Type scale preview" });
    await expect(preview).toBeVisible();

    const card = preview.locator("article").first();
    // Before a pair is picked the card paints its own surface.
    await expect
      .poll(() => styleOf(card, "background-color"))
      .not.toBe("rgba(0, 0, 0, 0)");

    await page.getByLabel("Text colour").click();
    await page
      .getByRole("option", { name: "neutral 950", exact: true })
      .click();
    await page.getByLabel("Background colour").click();
    await page.getByRole("option", { name: "neutral 50", exact: true }).click();

    /* With one picked the card has to get out of the way, or the text is
       previewed on studio chrome and the feature answers the wrong question. */
    await expect
      .poll(() => styleOf(card, "background-color"))
      .toBe("rgba(0, 0, 0, 0)");

    const stage = preview.locator("[data-preview-colours='true']");
    await expect(stage).toHaveCount(1);
    await expect
      .poll(() => styleOf(stage, "background-color"))
      .not.toBe("rgba(0, 0, 0, 0)");
  });

  test("a contrast verdict is coloured by its status", async ({ page }) => {
    await seed(page);
    await page.getByRole("button", { name: "Preview", exact: true }).click();
    const preview = page.getByRole("region", { name: "Type scale preview" });
    await expect(preview).toBeVisible();

    await page.getByLabel("Text colour").click();
    await page
      .getByRole("option", { name: "neutral 400", exact: true })
      .click();
    await page.getByLabel("Background colour").click();
    await page.getByRole("option", { name: "neutral 50", exact: true }).click();

    const pass = preview.locator("[data-status='pass']").first();
    const fail = preview.locator("[data-status='fail']").first();
    await expect(pass).toBeVisible();
    await expect(fail).toBeVisible();

    // Different rules, so a dropped one shows up as the two matching.
    expect(await styleOf(pass, "color")).not.toBe(await styleOf(fail, "color"));
  });
});

test.describe("The step specimen", () => {
  test("shows its glyphs whole, including a fallback's", async ({ page }) => {
    /* The row is an input, and an input clips at its padding box — its content
       box is the line box of the primary family alone. A Thai fallback sits
       taller than that, so the marks above and below were cut off: a preview
       cropping the thing it exists to show. */
    await seed(page);
    const steps = page.getByRole("region", { name: "Generated type steps" });
    const sample = steps.locator("input").first();
    await sample.fill("How vexingly zebra ทดสอบ");

    const fits = async () =>
      sample.evaluate((el: HTMLInputElement) => {
        const cs = getComputedStyle(el);
        /* The same text and font in something free to be as tall as it needs,
           which is what the row has to make room for. */
        const probe = document.createElement("span");
        probe.textContent = el.value;
        probe.style.font = cs.font;
        probe.style.lineHeight = "normal";
        probe.style.whiteSpace = "pre";
        probe.style.position = "absolute";
        probe.style.visibility = "hidden";
        document.body.appendChild(probe);
        const natural = probe.getBoundingClientRect().height;
        probe.remove();
        return {
          box: el.getBoundingClientRect().height,
          natural,
        };
      });

    /* Polled on the measurement rather than on a boolean, so a failure says
       how much room was short rather than "expected true, received false" —
       and which fallback a machine picked is exactly what a reader of that
       failure needs to know. */
    await expect
      .poll(async () => {
        const { box, natural } = await fits();
        return { short: Math.max(0, Math.round(natural - box)), box, natural };
      })
      .toMatchObject({ short: 0 });
  });
});
