import { expect, test } from "@playwright/test";
import {
  PROJECT_STORAGE_KEY,
  WORKSPACE_STORAGE_KEY,
  defaultProject,
} from "./fixtures";
import {
  TYPOGRAPHY_STORAGE_KEY,
  defaultTypographyProject,
} from "./typography-fixtures";

/**
 * The two studios share one stored document, so each has to be able to clear
 * its own half without touching the other's. These seed both legacy keys and
 * let the migration build the workspace, which is also how a real browser
 * arrives here.
 */
async function seedBoth(page: import("@playwright/test").Page) {
  await page.addInitScript(
    ({ paletteKey, palette, typeKey, type }) => {
      if (window.sessionStorage.getItem("blueprint.e2e-seeded.slices")) return;
      window.sessionStorage.setItem("blueprint.e2e-seeded.slices", "1");
      window.localStorage.setItem(paletteKey, JSON.stringify(palette));
      window.localStorage.setItem(typeKey, JSON.stringify(type));
    },
    {
      paletteKey: PROJECT_STORAGE_KEY,
      palette: defaultProject(),
      typeKey: TYPOGRAPHY_STORAGE_KEY,
      type: defaultTypographyProject(),
    },
  );
}

const readWorkspace = (page: import("@playwright/test").Page) =>
  page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, WORKSPACE_STORAGE_KEY);

test.describe("Workspace slices", () => {
  test("both studios migrate into one workspace, under the palette's name", async ({
    page,
  }) => {
    await seedBoth(page);
    await page.goto("/");
    await expect(
      page.getByRole("region", { name: "Palette toolbar" }),
    ).toBeVisible();

    const workspace = await readWorkspace(page);
    expect(workspace.name).toBe("My colour system");
    expect(workspace.palette).not.toBeNull();
    // Migrated from the legacy key even though only the palette studio ran.
    expect(workspace.typography).not.toBeNull();
  });

  test("starting a new type scale leaves the palette alone", async ({
    page,
  }) => {
    await seedBoth(page);
    await page.goto("/typography");
    await expect(
      page.getByRole("region", { name: "Type scale settings" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "New project" }).click();
    await page.getByRole("button", { name: "Start new project" }).click();

    const workspace = await readWorkspace(page);
    expect(workspace.typography).toBeNull();
    expect(workspace.palette).not.toBeNull();

    // And the palette studio still opens the palette rather than onboarding.
    await page.goto("/");
    await expect(page.getByLabel("Project name")).toHaveValue(
      "My colour system",
    );
  });

  test("starting a new palette leaves the type scale alone", async ({
    page,
  }) => {
    await seedBoth(page);
    await page.goto("/");
    await expect(
      page.getByRole("region", { name: "Palette toolbar" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "New project" }).click();
    await page.getByRole("button", { name: "Start new project" }).click();

    const workspace = await readWorkspace(page);
    expect(workspace.palette).toBeNull();
    expect(workspace.typography).not.toBeNull();

    await page.goto("/typography");
    await expect(
      page.getByRole("region", { name: "Type scale settings" }),
    ).toBeVisible();
  });

  test("rebuilds the workspace from the legacy keys if it is cleared", async ({
    page,
  }) => {
    await seedBoth(page);
    await page.goto("/");
    await expect(
      page.getByRole("region", { name: "Palette toolbar" }),
    ).toBeVisible();

    // The legacy keys are deliberately left in place, so this is recoverable.
    await page.evaluate(
      (key) => window.localStorage.removeItem(key),
      WORKSPACE_STORAGE_KEY,
    );
    await page.reload();
    await expect(page.getByLabel("Project name")).toHaveValue(
      "My colour system",
    );

    const workspace = await readWorkspace(page);
    expect(workspace.palette).not.toBeNull();
    expect(workspace.typography).not.toBeNull();
  });
});
