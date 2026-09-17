import { expect, test } from "./fixtures";

test.describe("Playground navigation", () => {
  test("switches between Shade generator, Semantics, and Accessibility", async ({
    seededPage: page,
  }) => {
    await expect(
      page.getByRole("region", { name: "Generated colour shades" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Semantics" }).click();
    await expect(
      page.getByRole("region", { name: "Semantic tokens" }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Palette toolbar" }),
    ).toBeHidden();

    await page.getByRole("button", { name: "Accessibility" }).click();
    await expect(
      page.getByRole("heading", { name: "Accessibility" }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Palette toolbar" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Add colour" })).toBeHidden();
    await expect(
      page.getByRole("button", { name: "Vision", exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Shade generator" }).click();
    await expect(
      page.getByRole("region", { name: "Generated colour shades" }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Palette toolbar" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Add colour" }),
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
