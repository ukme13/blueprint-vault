import { expect, test, openTheme } from "./fixtures";

test.describe("Workspace shell", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "New workspace" }),
    ).toBeVisible();
  });

  test("Blueprint returns Home, and the rail reaches every studio", async ({
    page,
  }) => {
    const rail = page.getByRole("navigation", { name: "Blueprint workspaces" });
    await expect(rail.getByRole("link", { name: "Blueprint" })).toBeVisible();
    await expect(rail.getByRole("link", { name: "Colour" })).toBeVisible();
    await expect(rail.getByRole("link", { name: "Typography" })).toBeVisible();
    await expect(rail.getByRole("link", { name: "Scale" })).toBeVisible();
    await expect(rail.getByRole("link", { name: "Preview" })).toBeVisible();

    await page.getByRole("button", { name: "Create workspace" }).click();
    await expect(page).toHaveURL(/\/colour\/?$/);
    await expect(
      page.getByRole("region", { name: "Generated colour shades" }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Playground sections" }),
    ).toBeVisible();

    await rail.getByRole("link", { name: "Typography" }).click();
    await expect(page).toHaveURL(/\/typography\/?$/);
    await expect(
      page.getByRole("region", { name: "Generated type steps" }),
    ).toBeVisible();

    await rail.getByRole("link", { name: "Scale" }).click();
    await expect(page).toHaveURL(/\/scale\/?$/);
    await expect(
      page.getByRole("region", { name: "Generated spacing steps" }),
    ).toBeVisible();

    await rail.getByRole("link", { name: "Preview" }).click();
    await expect(page).toHaveURL(/\/preview\/?$/);
    await expect(
      page.getByRole("heading", { name: "A system you can hand over" }),
    ).toBeVisible();

    await rail.getByRole("link", { name: "Blueprint" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole("heading", { name: "Untitled workspace" }),
    ).toBeVisible();
  });

  test("Theme is under Settings, not in the studio topbar", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Create workspace" }).click();
    await expect(
      page.getByRole("region", { name: "Palette toolbar" }),
    ).toBeVisible();

    await expect(page.getByRole("radiogroup", { name: "Theme" })).toBeHidden();

    const theme = await openTheme(page);
    await theme.getByRole("radio", { name: "Light" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("collapsed rail keeps accessible studio names", async ({ page }) => {
    await page.evaluate((key) => {
      window.localStorage.setItem(key, "1");
    }, "blueprint.shell.rail-collapsed");
    await page.reload();

    const rail = page.getByRole("navigation", { name: "Blueprint workspaces" });
    await expect(
      page.getByRole("button", { name: "Expand sidebar" }),
    ).toBeVisible();
    await expect(rail.getByRole("link", { name: "Colour" })).toBeVisible();

    await rail.getByRole("link", { name: "Colour" }).click();
    await expect(page).toHaveURL(/\/colour\/?$/);
    await expect(
      page.getByRole("heading", { name: "New colour system" }),
    ).toBeVisible();
  });
});
