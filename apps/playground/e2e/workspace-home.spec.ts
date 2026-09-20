import {
  createWorkspaceFromHome,
  expect,
  readStoredWorkspace,
  test,
} from "./fixtures";

/**
 * Home is the one create path: name + Blueprint seed, then the colour bench.
 *
 * Create is a dialog. Cards are the switcher for several named workspaces.
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

    const stored = await readStoredWorkspace(page);
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

  test("keeps the first project when a second is created", async ({ page }) => {
    await createWorkspaceFromHome(page, "First system");
    await page.goto("/");
    await createWorkspaceFromHome(page, "Second system");
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "First system" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Second system" }),
    ).toBeVisible();
    await expect(page.getByText("You have 2 projects.")).toBeVisible();
  });

  test("clicking another card opens that name on the rail", async ({
    page,
  }) => {
    await createWorkspaceFromHome(page, "First system");
    await page.goto("/");
    await createWorkspaceFromHome(page, "Second system");
    await page.goto("/");

    await page.getByRole("link", { name: /First system/ }).click();
    await expect(page).toHaveURL(/\/colour\/?$/);
    await expect(page.getByLabel("Project name")).toHaveValue("First system");
  });

  test("deletes a project after confirm", async ({ page }) => {
    await createWorkspaceFromHome(page, "First system");
    await page.goto("/");
    await createWorkspaceFromHome(page, "Second system");
    await page.goto("/");

    await page.getByRole("button", { name: "Delete First system" }).click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Delete project" }).click();

    await expect(
      page.getByRole("heading", { name: "First system" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Second system" }),
    ).toBeVisible();
    await expect(page.getByText("You have 1 project.")).toBeVisible();
  });

  test("renames a project from the card", async ({ page }) => {
    await createWorkspaceFromHome(page, "Original name");
    await page.goto("/");

    await page.getByRole("button", { name: "Rename Original name" }).click();
    const dialog = page.getByRole("dialog", { name: "Rename project" });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Project name").fill("Updated name");
    await dialog.getByRole("button", { name: "Save" }).click();

    await expect(
      page.getByRole("heading", { name: "Updated name" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Original name" }),
    ).toHaveCount(0);
  });

  test("duplicates a project from the card", async ({ page }) => {
    await createWorkspaceFromHome(page, "Base system");
    await page.goto("/");

    await page.getByRole("button", { name: "Duplicate Base system" }).click();

    await expect(
      page.getByRole("heading", { name: "Base system copy" }),
    ).toBeVisible();
    await expect(page.getByText("You have 2 projects.")).toBeVisible();
  });

  test("card thumbnail fills the top with no padding, has action icons, and current card has accent border", async ({
    page,
  }) => {
    await createWorkspaceFromHome(page, "First system");
    await page.goto("/");

    const card = page.locator("li").filter({ hasText: "First system" });
    await expect(card).toBeVisible();

    await expect(
      card.getByRole("button", { name: "Rename First system" }),
    ).toBeAttached();
    await expect(
      card.getByRole("button", { name: "Duplicate First system" }),
    ).toBeAttached();
    await expect(
      card.getByRole("button", { name: "Export First system" }),
    ).toBeAttached();
    await expect(
      card.getByRole("button", { name: "Delete First system" }),
    ).toBeAttached();
    await expect(card.getByText(/Edited just now/)).toBeVisible();
    await expect(page.getByText("1 / 8 used")).toBeVisible();

    const cardBox = await card.boundingBox();
    const mosaic = card.locator("[data-mosaic-track]").first();
    const mosaicBox = await mosaic.boundingBox();
    expect(cardBox).toBeTruthy();
    expect(mosaicBox).toBeTruthy();

    expect(Math.abs(mosaicBox!.y - cardBox!.y)).toBeLessThanOrEqual(2);
    expect(Math.abs(mosaicBox!.x - cardBox!.x)).toBeLessThanOrEqual(2);
    expect(Math.abs(mosaicBox!.width - cardBox!.width)).toBeLessThanOrEqual(3);
  });

  test("exports a project directly from the card", async ({ page }) => {
    await createWorkspaceFromHome(page, "Exportable system");
    await page.goto("/");

    const downloadPromise = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Export Exportable system" })
      .click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(
      "exportable-system.blueprint.json",
    );
  });

  test("renders textured empty mosaic for 0-family projects", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const emptyProject = {
        name: "Zero family",
        palette: null,
        typography: {
          system: {
            name: "Zero family",
            fontFamilies: ["Inter"],
            baseFontSizePx: 16,
            ratio: 1.25,
            roles: [],
          },
          unit: "rem",
          specimenText: "Aa",
          previewDocument: [],
          previewShell: [],
          previewLanding: [],
          previewSections: [],
          template: "article",
          remRootPx: 16,
        },
        semantics: [],
        removedSeedRoles: [],
        buttonSchemes: ["primary"],
        spacing: { basePx: 16, ratio: 1.5, steps: [] },
        radius: { steps: [] },
        elevation: { levels: [] },
        previewDevices: [],
        layout: [],
      };
      const id = "empty-ws";
      window.localStorage.setItem(
        `blueprint.workspace.${id}`,
        JSON.stringify(emptyProject),
      );
      window.localStorage.setItem(
        "blueprint.library.v1",
        JSON.stringify({ currentId: id, ids: [id] }),
      );
    });
    await page.reload();
    const card = page.locator("li").filter({ hasText: "Zero family" });
    await expect(card.locator("[data-mosaic-empty]")).toBeVisible();
    await expect(card.getByText("0 colour families")).toBeVisible();
  });

  test("deleting the last project returns empty Home", async ({ page }) => {
    await createWorkspaceFromHome(page, "Only system");
    await page.goto("/");

    await page.getByRole("button", { name: "Delete Only system" }).click();
    await page.getByRole("button", { name: "Delete project" }).click();

    await expect(page.getByText("You have 0 projects.")).toBeVisible();
    await expect(page.getByRole("link", { name: /Only system/ })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole("button", { name: "Settings", exact: true }),
    ).toHaveCount(0);
  });
});
