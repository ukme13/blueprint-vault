import { expect, test } from "./fixtures";

test.describe("Playground navigation", () => {
  test("switches between Overview, Shade generator, and Preview", async ({
    seededPage: page,
  }) => {
    await expect(
      page.getByRole("region", { name: "Generated colour shades" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Overview" }).click();
    await expect(
      page.getByRole("heading", { name: "My colour system" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Preview" }).click();
    await expect(
      page.getByRole("heading", { name: "Palette in context" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Shade generator" }).click();
    await expect(
      page.getByRole("region", { name: "Generated colour shades" }),
    ).toBeVisible();
  });

  test("resets to Shade generator after a full reload", async ({
    seededPage: page,
  }) => {
    await page.getByRole("button", { name: "Preview" }).click();
    await expect(
      page.getByRole("heading", { name: "Palette in context" }),
    ).toBeVisible();

    await page.reload();

    await expect(
      page.getByRole("region", { name: "Generated colour shades" }),
    ).toBeVisible();
  });
});
