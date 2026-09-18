import {
  createWorkspaceFromHome,
  expect,
  openWorkspaceSettings,
  test,
} from "./fixtures";

test.describe("Workspace settings", () => {
  test("Home and the studio rail open the same frames and layout table", async ({
    page,
  }) => {
    await page.goto("/");
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
    await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();

    const homeSettings = await openWorkspaceSettings(page);
    await expect(
      homeSettings.getByRole("region", { name: "Preview frames" }),
    ).toBeVisible();
    await expect(
      homeSettings.getByRole("table", { name: "Layout tokens" }),
    ).toBeVisible();
    await expect(
      homeSettings.getByText("Container inset", { exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(homeSettings).toBeHidden();

    await createWorkspaceFromHome(page);
    const railSettings = await openWorkspaceSettings(page);
    await expect(
      railSettings.getByRole("img", { name: "Phone cannot be removed" }),
    ).toBeVisible();
    await expect(
      railSettings.getByRole("columnheader", { name: /Phone/ }),
    ).toBeVisible();
    await expect(
      railSettings.getByRole("columnheader", { name: /Desktop/ }),
    ).toBeVisible();
  });

  test("an extra desktop is a column on the layout table and a typography frame", async ({
    page,
  }) => {
    await page.goto("/");
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
    await createWorkspaceFromHome(page);

    const settings = await openWorkspaceSettings(page);
    await settings.getByRole("button", { name: "Add desktop" }).click();
    await expect(
      settings.getByRole("columnheader", { name: /Desktop 2/ }),
    ).toBeVisible();
    await page.keyboard.press("Escape");

    await page.getByRole("link", { name: "Typography" }).click();
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
  });
});
