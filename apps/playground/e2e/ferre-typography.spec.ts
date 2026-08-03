import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/typography/ferre");
  await page.evaluate(() =>
    window.localStorage.removeItem("blueprint.ferre-typography.v1"),
  );
  await page.reload();
});

test.describe("Ferre typography", () => {
  test("loads the responsive Ferre preset", async ({ page }) => {
    await expect(page.getByText("23 roles · 2 fonts")).toBeVisible();
    await expect(page.getByRole("button", { name: "h1 56px" })).toBeVisible();
    await expect(page.getByLabel("desktop font size")).toHaveValue("56");
  });

  test("switches to mobile values and updates the selected role", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Mobile" }).click();
    await expect(page.getByLabel("mobile font size")).toHaveValue("24");

    await page.getByLabel("mobile font size").fill("26");
    await page.getByLabel("mobile font size").blur();
    await expect(page.getByRole("button", { name: "h1 26px" })).toBeVisible();
  });

  test("exports responsive CSS", async ({ page }) => {
    await page.getByRole("button", { name: "Export" }).click();
    await expect(
      page.getByRole("dialog", { name: "Export Ferre typography" }),
    ).toContainText("@media (min-width: 768px)");
  });

  test("adds and removes a custom role", async ({ page }) => {
    await page.getByRole("button", { name: "Add role" }).click();
    await expect(page.getByLabel("Role name")).toHaveValue("new-role");
    await expect(page.getByText("24 roles · 2 fonts")).toBeVisible();

    await page.getByRole("button", { name: "Remove" }).click();
    await expect(page.getByText("23 roles · 2 fonts")).toBeVisible();
  });
});
