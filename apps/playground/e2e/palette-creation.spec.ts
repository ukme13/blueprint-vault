import { expect, test, WORKSPACE_STORAGE_KEY } from "./fixtures";

/**
 * The colour studio still has a create door when its slice is empty.
 * Home is the intended path; this covers the leftover door until Stage 3.
 */

test.describe("Creating a palette", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/colour");
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
    await expect(page.getByLabel("Project name")).toBeVisible();
  });

  test("seeds the seventy-two roles and opens on Shade generator", async ({
    page,
  }) => {
    await page.getByLabel("Project name").fill("First system");
    await page.getByRole("button", { name: "Create palette" }).click();

    await expect(
      page.getByRole("region", { name: "Palette toolbar" }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Generated colour shades" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Semantics" }).click();
    const editor = page.getByRole("region", { name: "Semantic tokens" });
    await expect(editor).toBeVisible();
    await expect(editor.locator("tr:has([data-token])")).toHaveCount(72);

    await expect
      .poll(async () =>
        page.evaluate((key) => {
          const raw = window.localStorage.getItem(key);
          if (!raw) return 0;
          const stored = JSON.parse(raw) as { semantics?: unknown[] };
          return Array.isArray(stored.semantics) ? stored.semantics.length : 0;
        }, WORKSPACE_STORAGE_KEY),
      )
      .toBe(72);
  });

  test("reseeds after starting a new project", async ({ page }) => {
    await page.getByRole("button", { name: "Create palette" }).click();
    await expect(
      page.getByRole("region", { name: "Palette toolbar" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "New project" }).click();
    await page.getByRole("button", { name: "Start new project" }).click();
    await expect(page.getByLabel("Project name")).toBeVisible();

    await page.getByRole("button", { name: "Create palette" }).click();
    await page.getByRole("button", { name: "Semantics" }).click();
    await expect(
      page
        .getByRole("region", { name: "Semantic tokens" })
        .locator("tr:has([data-token])"),
    ).toHaveCount(72);
  });
});
