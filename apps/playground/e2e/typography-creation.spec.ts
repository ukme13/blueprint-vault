import { expect, test } from "@playwright/test";

test.describe("Typography creation", () => {
  test("creates a type scale from the creation screen", async ({ page }) => {
    await page.goto("/typography");

    await expect(
      page.getByRole("heading", { name: "Create your type scale" }),
    ).toBeVisible();

    await page.getByLabel("Project name").fill("Ferre Type");
    await page.getByRole("button", { name: "Create type scale" }).click();

    await expect(page.getByLabel("Project name")).toHaveValue("Ferre Type");
    await expect(
      page.getByRole("region", { name: "Generated type steps" }),
    ).toBeVisible();
  });

  test("requires a project name", async ({ page }) => {
    await page.goto("/typography");

    await page.getByLabel("Project name").fill("   ");
    await page.getByRole("button", { name: "Create type scale" }).click();

    await expect(page.getByText("Enter a project name.")).toBeVisible();
  });
});
