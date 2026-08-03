import { expect, test } from "./typography-fixtures";

test.describe("Typography persistence", () => {
  test("restores the project after a full reload", async ({
    seededPage: page,
  }) => {
    await expect(page.getByLabel("Project name")).toHaveValue("My type scale");

    await page.reload();

    await expect(page.getByLabel("Project name")).toHaveValue("My type scale");
    await expect(
      page.getByRole("region", { name: "Generated type steps" }),
    ).toBeVisible();
  });

  test("returns to the creation screen after starting a new project", async ({
    seededPage: page,
  }) => {
    await page.getByRole("button", { name: "New project" }).click();
    await page.getByRole("button", { name: "Start new project" }).click();

    await expect(
      page.getByRole("heading", { name: "Create your type scale" }),
    ).toBeVisible();

    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Create your type scale" }),
    ).toBeVisible();
  });
});
