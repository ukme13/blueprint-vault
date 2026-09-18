import {
  createWorkspaceFromHome,
  expect,
  test,
  WORKSPACE_STORAGE_KEY,
} from "./fixtures";

/**
 * Home is the one create path: name + Blueprint seed, then the colour bench.
 *
 * Create is a dialog. v1 lists the current browser workspace as a card.
 */

test.describe("Workspace home", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
    await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Blueprint" }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Blueprint" }).getByRole("link", {
        name: "Blueprint",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Blueprint workspaces" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Settings", exact: true }),
    ).toHaveCount(0);
  });

  test("creates a seeded workspace and opens Shade generator", async ({
    page,
  }) => {
    await createWorkspaceFromHome(page, "First system");

    await expect(page).toHaveURL(/\/colour\/?$/);
    await expect(
      page.getByRole("region", { name: "Generated colour shades" }),
    ).toBeVisible();
    await expect(page.getByLabel("Project name")).toHaveValue("First system");

    await page.getByRole("button", { name: "Semantics" }).click();
    await expect(
      page
        .getByRole("region", { name: "Semantic tokens" })
        .locator("tr:has([data-token])"),
    ).toHaveCount(72);

    const stored = await page.evaluate((key) => {
      const raw = window.localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw) as {
        semantics?: unknown[];
        typography?: unknown;
      };
    }, WORKSPACE_STORAGE_KEY);
    expect(stored?.semantics).toHaveLength(72);
    expect(stored?.typography).not.toBeNull();

    await page.goto("/typography");
    await expect(
      page.getByRole("region", { name: "Generated type steps" }),
    ).toBeVisible();
    await expect(page.getByLabel("Project name")).toHaveValue("First system");
  });

  test("requires a project name", async ({ page }) => {
    await page.getByRole("button", { name: "New project" }).click();
    const dialog = page.getByRole("dialog", { name: "New project" });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Project name").fill("");
    await dialog.getByRole("button", { name: "Create workspace" }).click();

    const error = dialog.getByText("Enter a project name.", { exact: true });
    await expect(error).toHaveAttribute("role", "alert");
  });

  test("imports a saved project", async ({ page }) => {
    const importedProject = {
      kind: "blueprint-palette",
      version: 1,
      project: {
        name: "Opened project",
        tracks: [
          { id: "primary", name: "primary", seedHex: "#7646ab" },
          { id: "neutral", name: "neutral", seedHex: "#737373" },
        ],
        lightnessPattern: "custom",
        lightnessValues: [
          97.5, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 25, 20,
          15, 10, 5,
        ],
      },
    };
    const chooserPromise = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Import project" }).click();
    const chooser = await chooserPromise;
    await chooser.setFiles({
      name: "opened.blueprint.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(importedProject)),
    });

    await expect(page).toHaveURL(/\/colour\/?$/);
    await expect(page.getByLabel("Project name")).toHaveValue("Opened project");
  });

  test("opens the current workspace instead of creating again", async ({
    page,
  }) => {
    await createWorkspaceFromHome(page);
    await expect(
      page.getByRole("region", { name: "Generated colour shades" }),
    ).toBeVisible();

    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Untitled workspace" }),
    ).toBeVisible();
    const familyRows = page.locator("[data-mosaic-track]");
    await expect(familyRows).toHaveCount(7);
    const firstFamily = await familyRows.nth(0).boundingBox();
    const secondFamily = await familyRows.nth(1).boundingBox();
    expect(firstFamily).toBeTruthy();
    expect(secondFamily).toBeTruthy();
    expect(firstFamily!.y + firstFamily!.height).toBeLessThanOrEqual(
      secondFamily!.y + 1,
    );
    expect(firstFamily!.x).toBe(secondFamily!.x);
    expect(firstFamily!.width).toBe(secondFamily!.width);
    await page.getByRole("link", { name: /Untitled workspace/ }).click();
    await expect(page).toHaveURL(/\/colour\/?$/);
    await expect(
      page.getByRole("region", { name: "Generated colour shades" }),
    ).toBeVisible();
  });
});
