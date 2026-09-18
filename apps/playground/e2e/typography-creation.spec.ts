import { createWorkspaceFromHome, expect, test } from "./fixtures";

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
