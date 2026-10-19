import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

/**
 * HSL as a colour format: offered wherever the others are (the picker, the
 * shade popover, the export), written as CSS writes it, and typed back in.
 */

async function openShade(page: Page) {
  await page.getByRole("button", { name: /Select primary 200,/ }).click();
  const details = page.getByRole("dialog", {
    name: "primary 200 shade details",
  });
  await expect(details).toBeVisible();
  return details;
}

async function chooseFormat(page: Page, scope: ReturnType<Page["locator"]>) {
  await scope.getByLabel("Shade colour format").click();
  await page.getByRole("option", { name: "HSL", exact: true }).click();
}

test.describe("HSL colour format", () => {
  test("is chosen in the shade popover, and copied as hsl()", async ({
    seededPage: page,
  }) => {
    const details = await openShade(page);
    await chooseFormat(page, details);

    await expect(details.getByLabel("Shade colour format")).toContainText(
      "HSL",
    );
    await expect(
      details.getByRole("button", { name: "Copy HSL value" }),
    ).toContainText(/^hsl\(\d+(\.\d)? \d+(\.\d)?% \d+(\.\d)?%\)$/);
  });

  test("is kept for the next visit", async ({ seededPage: page }) => {
    const details = await openShade(page);
    await chooseFormat(page, details);
    await page.keyboard.press("Escape");

    await page.reload();
    await page.getByRole("button", { name: /Select primary 200,/ }).click();
    await expect(
      page
        .getByRole("dialog", { name: "primary 200 shade details" })
        .getByLabel("Shade colour format"),
    ).toContainText("HSL");
  });

  test("gives the picker hue, saturation and lightness, and a value that is typed back in", async ({
    seededPage: page,
  }) => {
    const details = await openShade(page);
    await chooseFormat(page, details);
    await details
      .getByRole("button", { name: "Edit primary 200 colour" })
      .click();

    const picker = page.getByRole("dialog", {
      name: "primary 200 manual colour picker",
    });
    await expect(picker).toBeVisible();
    for (const channel of ["Hue", "Saturation", "Lightness"]) {
      await expect(
        picker.getByRole("slider", { name: `${channel} slider` }),
      ).toBeVisible();
    }
    /* RGB and OKLCH sliders are not left behind. */
    await expect(picker.getByLabel("Red value")).toHaveCount(0);
    await expect(picker.getByLabel("Chroma value")).toHaveCount(0);

    const field = picker.getByRole("textbox", {
      name: "primary 200 manual colour HSL value",
    });
    await expect(field).toHaveValue(/^hsl\(/);

    /* A typed HSL reaches the shade: pure red, which no seeded shade is. */
    await field.fill("hsl(0 100% 50%)");
    await expect(picker.getByLabel("Hue value")).toHaveValue("0");
    await expect(picker.getByLabel("Saturation value")).toHaveValue("100");
    await expect(picker.getByLabel("Lightness value")).toHaveValue("50");
    await expect(field).toHaveValue("hsl(0 100% 50%)");

    /* A slider moves the colour, and the field follows it. */
    await picker.getByLabel("Lightness value").fill("25");
    /* Through a HEX, so 25% lands within a tenth of itself. */
    await expect(field).toHaveValue(/^hsl\(0 100% 25(\.\d)?%\)$/);
  });

  test("is an export colour format, written into the file", async ({
    seededPage: page,
  }) => {
    await page.getByRole("button", { name: "Export palette" }).click();
    const preview = page.getByRole("region", { name: "Export preview" });
    await expect(preview).toBeVisible();

    await page.getByLabel("Export colour format").click();
    await page.getByRole("option", { name: "HSL", exact: true }).click();

    await expect(preview).toContainText("--color-primary-50: hsl(");
    await expect(preview).not.toContainText("oklch(");
  });
});
