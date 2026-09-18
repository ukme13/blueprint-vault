import { createWorkspaceFromHome, expect, seedProject, test } from "./fixtures";

test.describe("Typography after Home create", () => {
  test("opens the seeded type scale without a second create door", async ({
    page,
  }) => {
    await page.goto("/");
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();

    await createWorkspaceFromHome(page, "Ferre Type");
    await expect(page).toHaveURL(/\/colour\/?$/);

    await page.goto("/typography");
    await expect(page.getByLabel("Project name")).toHaveValue("Ferre Type");
    await expect(
      page.getByRole("region", { name: "Generated type steps" }),
    ).toBeVisible();
  });
});

test.describe("Typography without a workspace", () => {
  test("returns Home instead of opening a create door", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => window.localStorage.clear());
    await page.goto("/typography");

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create type scale" }),
    ).toHaveCount(0);
  });
});

test.describe("A leftover colour-only workspace", () => {
  test("seeds Typography from Blueprint without a second create form", async ({
    page,
  }) => {
    await seedProject(page);
    await page.goto("/typography");

    await expect(
      page.getByRole("heading", { name: "This slice isn't open yet" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create type scale" }),
    ).toHaveCount(0);

    await page.getByRole("button", { name: "Seed from Blueprint" }).click();
    await expect(
      page.getByRole("region", { name: "Generated type steps" }),
    ).toBeVisible();
  });
});
