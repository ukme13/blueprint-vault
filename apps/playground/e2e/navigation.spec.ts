import { expect, test } from "./fixtures";

test.describe("Playground navigation", () => {
  test("switches between Overview, Shade generator, and Accessibility", async ({
    seededPage: page,
  }) => {
    await expect(
      page.getByRole("region", { name: "Generated colour shades" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Overview" }).click();
    await expect(
      page.getByRole("heading", { name: "My colour system" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Accessibility" }).click();
    await expect(
      page.getByRole("heading", { name: "Accessibility" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Shade generator" }).click();
    await expect(
      page.getByRole("region", { name: "Generated colour shades" }),
    ).toBeVisible();
  });

  test("resets to Shade generator after a full reload", async ({
    seededPage: page,
  }) => {
    await page.getByRole("button", { name: "Accessibility" }).click();
    await expect(
      page.getByRole("heading", { name: "Accessibility" }),
    ).toBeVisible();

    await page.reload();

    await expect(
      page.getByRole("region", { name: "Generated colour shades" }),
    ).toBeVisible();
  });
});
