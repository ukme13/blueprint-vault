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
});
