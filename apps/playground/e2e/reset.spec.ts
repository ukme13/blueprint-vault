import { expect, test } from "./fixtures";

test.describe("Reset to Blueprint 20", () => {
  test("restores 20 shades after the shade count was changed", async ({
    seededPage: page,
  }) => {
    const shadeCountInput = page.getByLabel("Shade count", { exact: true });
    await shadeCountInput.fill("10");
    await shadeCountInput.blur();
    await expect(shadeCountInput).toHaveValue("10");

    await page.getByRole("button", { name: "Reset preset" }).click();

    await expect(shadeCountInput).toHaveValue("20");
    await expect(page.getByLabel(/target lightness$/)).toHaveCount(20);
  });
});
