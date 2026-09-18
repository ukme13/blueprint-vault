import { createWorkspaceFromHome, expect, openTheme, test } from "./fixtures";

test.describe("Workspace shell", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    await page.reload();
    await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
  });

  test("Home has no tool rail; Blueprint returns Home from a studio", async ({
    page,
  }) => {
    await expect(
      page.getByRole("navigation", { name: "Blueprint" }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Blueprint workspaces" }),
    ).toHaveCount(0);

    await createWorkspaceFromHome(page);
    await expect(page).toHaveURL(/\/colour\/?$/);

    const rail = page.getByRole("navigation", { name: "Blueprint workspaces" });
    await expect(rail.getByRole("link", { name: "Blueprint" })).toBeVisible();
    await expect(rail.getByRole("button", { name: "Settings" })).toBeVisible();
    await expect(rail.getByRole("link", { name: "Colour" })).toBeVisible();
    await expect(rail.getByRole("link", { name: "Typography" })).toBeVisible();
    await expect(rail.getByRole("link", { name: "Spacing" })).toBeVisible();
    await expect(rail.getByRole("link", { name: "Radius" })).toBeVisible();
    await expect(rail.getByRole("link", { name: "Elevation" })).toBeVisible();
    await expect(rail.getByRole("link", { name: "Preview" })).toBeVisible();
    await expect(rail.getByRole("link", { name: "Scale" })).toHaveCount(0);
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

    await rail.getByRole("link", { name: "Spacing" }).click();
    await expect(page).toHaveURL(/\/spacing\/?$/);
    await expect(
      page.getByRole("region", { name: "Generated spacing steps" }),
    ).toBeVisible();

    await rail.getByRole("link", { name: "Radius" }).click();
    await expect(page).toHaveURL(/\/radius\/?$/);
    await expect(
      page.getByRole("region", { name: "Radius", exact: true }),
    ).toBeVisible();

    await rail.getByRole("link", { name: "Elevation" }).click();
    await expect(page).toHaveURL(/\/elevation\/?$/);
    await expect(
      page.getByRole("region", { name: "Elevation", exact: true }),
    ).toBeVisible();

    await rail.getByRole("link", { name: "Preview" }).click();
    await expect(page).toHaveURL(/\/preview\/?$/);
    await expect(
      page.getByRole("heading", { name: "A system you can hand over" }),
    ).toBeVisible();

    await rail.getByRole("link", { name: "Blueprint" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole("navigation", { name: "Blueprint" }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Blueprint workspaces" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Untitled workspace" }),
    ).toBeVisible();
  });

  test("Theme is a button group on the rail, not in the studio topbar", async ({
    page,
  }) => {
    await createWorkspaceFromHome(page);
    await expect(
      page.getByRole("region", { name: "Palette toolbar" }),
    ).toBeVisible();

    const theme = await openTheme(page);
    await expect(theme).toBeVisible();
    await theme.getByRole("radio", { name: "Light" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("studio rail icons share the SideNav sm size", async ({ page }) => {
    await createWorkspaceFromHome(page);
    await expect(
      page.getByRole("region", { name: "Palette toolbar" }),
    ).toBeVisible();
    const rail = page.getByRole("navigation", { name: "Blueprint workspaces" });
    await expect(rail.getByRole("link", { name: "Colour" })).toBeVisible();

    const sizes = await rail.getByRole("link").evaluateAll((links) =>
      links
        .map((link) => link.querySelector("svg"))
        .filter((svg): svg is SVGSVGElement => svg instanceof SVGSVGElement)
        .map((svg) => {
          const box = svg.getBoundingClientRect();
          return { w: Math.round(box.width), h: Math.round(box.height) };
        }),
    );

    expect(sizes.length).toBeGreaterThanOrEqual(5);
    expect(new Set(sizes.map((size) => `${size.w}x${size.h}`)).size).toBe(1);
    expect(sizes[0]!.w).toBe(16);
    expect(sizes[0]!.h).toBe(16);
  });

  test("collapsed rail keeps accessible studio names", async ({ page }) => {
    await createWorkspaceFromHome(page);
    await expect(page).toHaveURL(/\/colour\/?$/);

    await page.evaluate((key) => {
      window.localStorage.setItem(key, "1");
    }, "blueprint.shell.rail-collapsed");
    await page.reload();

    const rail = page.getByRole("navigation", { name: "Blueprint workspaces" });
    await expect(
      page.getByRole("button", { name: "Expand sidebar" }),
    ).toBeVisible();
    await expect(rail.getByRole("link", { name: "Colour" })).toBeVisible();
    await expect(page.getByRole("radiogroup", { name: "Theme" })).toBeHidden();
    await expect(page.getByRole("button", { name: "Theme" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Settings", exact: true }),
    ).toBeVisible();

    await rail.getByRole("link", { name: "Colour" }).click();
    await expect(page).toHaveURL(/\/colour\/?$/);
    await expect(
      page.getByRole("region", { name: "Generated colour shades" }),
    ).toBeVisible();
  });

  test("Space swaps the current studio with Preview", async ({ page }) => {
    await createWorkspaceFromHome(page);
    await expect(
      page.getByRole("region", { name: "Generated colour shades" }),
    ).toBeVisible();

    await page.evaluate(() => {
      const el = document.activeElement;
      if (el instanceof HTMLElement) el.blur();
    });
    await page.keyboard.press("Space");
    await expect(page).toHaveURL(/\/preview\/?$/);
    await expect(
      page.getByRole("heading", { name: "A system you can hand over" }),
    ).toBeVisible();

    await page.evaluate(() => {
      const el = document.activeElement;
      if (el instanceof HTMLElement) el.blur();
    });
    await page.keyboard.press("Space");
    await expect(page).toHaveURL(/\/colour\/?$/);
  });

  test("Space in a field does not open Preview", async ({ page }) => {
    await createWorkspaceFromHome(page);
    await page.getByLabel("Project name").click();
    await page.keyboard.press("Space");
    await expect(page).toHaveURL(/\/colour\/?$/);
  });
});
