import {
  createWorkspaceFromHome,
  expect,
  openWorkspaceSettings,
  test,
} from "./fixtures";

test.describe("Workspace settings", () => {
  test("Home has no Settings; the studio rail opens this workspace's frames", async ({
    page,
  }) => {
    await page.goto("/");
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
    await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Settings", exact: true }),
    ).toHaveCount(0);

    await createWorkspaceFromHome(page);
    const railSettings = await openWorkspaceSettings(page);
    await expect(
      railSettings.getByRole("region", { name: "Preview frames" }),
    ).toBeVisible();
    await expect(
      railSettings.getByRole("table", { name: "Layout tokens" }),
    ).toHaveCount(0);
    await expect(
      railSettings.getByRole("img", { name: "Phone cannot be removed" }),
    ).toBeVisible();
    await expect(
      railSettings.getByLabel("Phone width", { exact: true }),
    ).toBeVisible();
    await expect(
      railSettings.getByLabel("Desktop width", { exact: true }),
    ).toBeVisible();
  });

  test("an extra desktop is a typography frame and a spacing-use column", async ({
    page,
  }) => {
    await page.goto("/");
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
    await createWorkspaceFromHome(page);

    const settings = await openWorkspaceSettings(page);
    await settings.getByRole("button", { name: "Add desktop" }).click();
    await expect(
      settings.getByText("Desktop 2", { exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(settings).toBeHidden();

    await page
      .getByRole("navigation", { name: "Blueprint workspaces" })
      .getByRole("link", { name: "Typography" })
      .click();
    await expect(page).toHaveURL(/\/typography\/?$/);
    await expect(
      page.getByRole("region", { name: "Generated type steps" }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("navigation", { name: "Preview devices" })
        .getByRole("button", { name: "Desktop 2" }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("region", { name: "Type scale settings" })
        .getByRole("button", { name: "Add desktop" }),
    ).toHaveCount(0);

    await page
      .getByRole("navigation", { name: "Blueprint workspaces" })
      .getByRole("link", { name: "Spacing" })
      .click();
    await expect(page).toHaveURL(/\/spacing\/?$/);
    await page
      .getByRole("navigation", { name: "Scale sections" })
      .getByRole("button", { name: "Uses" })
      .click();
    await expect(
      page.getByRole("columnheader", { name: /Desktop 2/ }),
    ).toBeVisible();
    const uses = page.getByRole("region", { name: "Spacing uses" });
    await expect(uses.getByLabel("inset-container name")).toHaveValue(
      "Container inset",
    );
    await expect(uses.getByLabel("radius-surface name")).toHaveCount(0);
  });
});
