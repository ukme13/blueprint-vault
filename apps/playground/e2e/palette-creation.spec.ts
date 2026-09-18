import { expect, test } from "./fixtures";
import { seedTypographyProject } from "./typography-fixtures";

/**
 * Home is the only create path. Colour without a workspace returns there.
 * A leftover type-only document can seed this slice, not start a second project.
 */

test.describe("Colour without a workspace", () => {
  test("returns Home instead of opening a create door", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => window.localStorage.clear());
    await page.goto("/colour");

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create palette" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "New project" }),
    ).toBeVisible();
  });
});

test.describe("A leftover type-only workspace", () => {
  test("seeds Colour from Blueprint without a second create form", async ({
    page,
  }) => {
    await seedTypographyProject(page);
    await page.goto("/colour");

    await expect(
      page.getByRole("heading", { name: "This slice isn't open yet" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create palette" }),
    ).toHaveCount(0);

    await page.getByRole("button", { name: "Seed from Blueprint" }).click();
    await expect(
      page.getByRole("region", { name: "Palette toolbar" }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Generated colour shades" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Semantics" }).click();
    await expect(
      page
        .getByRole("region", { name: "Semantic tokens" })
        .locator("tr:has([data-token])"),
    ).toHaveCount(72);
  });
});
