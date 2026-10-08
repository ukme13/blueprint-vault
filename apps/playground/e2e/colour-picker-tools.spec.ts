import type { Locator, Page } from "@playwright/test";
import { expect, test } from "./fixtures";

/**
 * The desktop colour picker's two tools: it can be picked up by its header and
 * put somewhere that does not cover the shades, and it can sample a colour from
 * anywhere on screen where the browser has an eyedropper.
 */
async function openPicker(page: Page): Promise<Locator> {
  await page.getByRole("button", { name: /Select primary 200,/ }).click();
  await page
    .getByRole("dialog", { name: "primary 200 shade details" })
    .getByRole("button", { name: "Edit primary 200 colour" })
    .click();
  const picker = page.getByRole("dialog", {
    name: "primary 200 manual colour picker",
  });
  await expect(picker).toBeVisible();
  return picker;
}

/** The popover the picker sits in: the thing that moves. */
const surface = (picker: Locator) =>
  picker.evaluate((node) => {
    const box = (node.closest("[popover]") ?? node).getBoundingClientRect();
    return { x: box.x, y: box.y, right: box.right, bottom: box.bottom };
  });

/** A point in the header clear of its two controls, where a press is a drag. */
async function grip(picker: Locator) {
  const box = (await picker
    .locator('[class*="colourPickerHeader"]')
    .boundingBox())!;
  return { x: box.x + box.width * 0.62, y: box.y + box.height / 2 };
}

test.describe("Moving the colour picker", () => {
  test("is picked up by its header, and goes where it is put", async ({
    seededPage: page,
  }) => {
    const picker = await openPicker(page);
    const header = picker.locator('[class*="colourPickerHeader"]');
    await expect(header).toHaveCSS("cursor", "grab");

    const start = await surface(picker);
    const from = await grip(picker);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x - 60, from.y - 20, { steps: 4 });
    /* Held, it says so. */
    await expect(header).toHaveCSS("cursor", "grabbing");
    await page.mouse.move(from.x - 120, from.y - 40, { steps: 4 });
    await page.mouse.up();

    const moved = await surface(picker);
    expect(moved.x - start.x).toBeCloseTo(-120, 0);
    expect(moved.y - start.y).toBeCloseTo(-40, 0);
    await expect(header).toHaveCSS("cursor", "grab");

    /* The picker still works where it is. */
    const hex = picker.getByLabel("primary 200 manual colour HEX value");
    await hex.fill("#112233");
    await expect(hex).toHaveValue("#112233");
    expect((await surface(picker)).x).toBeCloseTo(moved.x, 0);
  });

  test("stays inside the window, however far it is dragged", async ({
    seededPage: page,
  }) => {
    const picker = await openPicker(page);
    const viewport = page.viewportSize()!;

    /* To the two corners of the window: the panel's grip can never reach
       them, because its edge meets the window first. */
    for (const corner of [
      { x: 2, y: 2, side: "left" },
      { x: viewport.width - 2, y: viewport.height - 2, side: "right" },
    ] as const) {
      const at = await grip(picker);
      await page.mouse.move(at.x, at.y);
      await page.mouse.down();
      await page.mouse.move(corner.x, corner.y, { steps: 8 });
      await page.mouse.up();
      const box = await surface(picker);
      expect(box.x).toBeGreaterThanOrEqual(-1);
      expect(box.y).toBeGreaterThanOrEqual(-1);
      expect(box.right).toBeLessThanOrEqual(viewport.width + 1);
      expect(box.bottom).toBeLessThanOrEqual(viewport.height + 1);
      /* And it did go as far as the edge: it is not frozen. */
      const reached =
        corner.side === "left" ? box.x : viewport.width - box.right;
      expect(Math.abs(reached)).toBeLessThan(2);
    }
  });

  test("a press on its own controls is theirs, and a closed picker opens where it did", async ({
    seededPage: page,
  }) => {
    const picker = await openPicker(page);
    const start = await surface(picker);

    /* Dragging from the format selector does not move the panel. */
    const selector = picker.getByLabel("Colour format");
    const pressed = (await selector.boundingBox())!;
    await page.mouse.move(pressed.x + 8, pressed.y + pressed.height / 2);
    await page.mouse.down();
    await page.mouse.move(pressed.x - 90, pressed.y + 90, { steps: 4 });
    await page.mouse.up();
    expect((await surface(picker)).x).toBeCloseTo(start.x, 0);

    /* Moved, closed, opened again: back where it opens. */
    const from = await grip(picker);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x - 150, from.y + 90, { steps: 4 });
    await page.mouse.up();
    expect((await surface(picker)).x).not.toBeCloseTo(start.x, 0);

    await picker.getByRole("button", { name: /^Close .* picker$/ }).click();
    await expect(picker).toBeHidden();
    await page
      .getByRole("dialog", { name: "primary 200 shade details" })
      .getByRole("button", { name: "Edit primary 200 colour" })
      .click();
    await expect(picker).toBeVisible();
    const again = await surface(picker);
    expect(again.x).toBeCloseTo(start.x, 0);
    expect(again.y).toBeCloseTo(start.y, 0);
  });
});

/** Sets what the browser says about `EyeDropper` before the page is read. */
async function withEyeDropper(
  page: Page,
  behaviour: "samples" | "dismissed" | "missing",
) {
  await page.addInitScript((mode) => {
    const scope = window as unknown as { EyeDropper?: unknown };
    if (mode === "missing") {
      delete scope.EyeDropper;
      Object.defineProperty(window, "EyeDropper", {
        configurable: true,
        value: undefined,
      });
      return;
    }
    scope.EyeDropper = class {
      async open() {
        if (mode === "dismissed") {
          throw new DOMException("The user aborted a request.", "AbortError");
        }
        return { sRGBHex: "#1a2b3c" };
      }
    };
  }, behaviour);
  await page.reload();
}

test.describe("Sampling a colour from the screen", () => {
  test("applies the colour under the eyedropper, and shows it in the field", async ({
    seededPage: page,
  }) => {
    await withEyeDropper(page, "samples");
    const picker = await openPicker(page);
    const hex = picker.getByLabel("primary 200 manual colour HEX value");
    const before = await hex.inputValue();

    await picker
      .getByRole("button", {
        name: "Pick primary 200 manual colour from the screen",
      })
      .click();
    await expect(hex).toHaveValue("#1A2B3C");
    expect(before).not.toBe("#1A2B3C");
    /* Applied, not only drawn: the picker's own swatch holds it. */
    await expect(picker.locator('[class*="colourHexSwatch"]')).toHaveCSS(
      "background-color",
      "rgb(26, 43, 60)",
    );
  });

  test("leaves the colour alone when the sampling is dismissed", async ({
    seededPage: page,
  }) => {
    await withEyeDropper(page, "dismissed");
    const picker = await openPicker(page);
    const hex = picker.getByLabel("primary 200 manual colour HEX value");
    const before = await hex.inputValue();

    await picker
      .getByRole("button", {
        name: "Pick primary 200 manual colour from the screen",
      })
      .click();
    await expect(hex).toHaveValue(before);
    /* And it can be tried again: the button is back. */
    await expect(
      picker.getByRole("button", {
        name: "Pick primary 200 manual colour from the screen",
      }),
    ).toBeEnabled();
  });

  test("has no button where the browser has no eyedropper", async ({
    seededPage: page,
  }) => {
    await withEyeDropper(page, "missing");
    const picker = await openPicker(page);
    await expect(
      picker.getByLabel("primary 200 manual colour HEX value"),
    ).toBeVisible();
    await expect(
      picker.getByRole("button", { name: /from the screen/ }),
    ).toHaveCount(0);
  });
});
