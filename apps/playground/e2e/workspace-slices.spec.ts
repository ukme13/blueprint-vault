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

  test("retires the legacy keys once the workspace has taken over", async ({
    page,
  }) => {
    /* They were kept so a browser that hit a bug could be recovered by
       clearing one key. A project file does that better now, and the snapshot
       they hold has gone stale in a way that made the recovery a lie: a
       workspace carries semantics, spacing, radius and elevation, and these two
       keys carry none of them.

       Removed only once the workspace reads back on its own, so a migration
       that has not been persisted yet still has its source. */
    await seedBoth(page);
    await page.goto("/");
    await expect(
      page.getByRole("region", { name: "Palette toolbar" }),
    ).toBeVisible();

    const remaining = async () =>
      page.evaluate(
        (keys) =>
          keys.filter((key) => window.localStorage.getItem(key) !== null),
        [PROJECT_STORAGE_KEY, TYPOGRAPHY_STORAGE_KEY],
      );

    /* The first load migrates and persists; the next one finds a workspace and
       drops what it was built from. */
    await page.reload();
    await expect(
      page.getByRole("region", { name: "Palette toolbar" }),
    ).toBeVisible();

    await expect.poll(remaining).toEqual([]);

    const workspace = await readWorkspace(page);
    expect(workspace.palette).not.toBeNull();
    expect(workspace.typography).not.toBeNull();
  });

  test("does not resurrect a stale snapshot when the workspace is cleared", async ({
    page,
  }) => {
    /* The behaviour this replaces. Clearing the workspace used to rebuild it
       from keys nothing had written since the migration, restoring two slices
       and silently resetting four — which looked like it had worked. Starting
       over is now starting over. */
    await seedBoth(page);
    await page.goto("/");
    await expect(
      page.getByRole("region", { name: "Palette toolbar" }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("region", { name: "Palette toolbar" }),
    ).toBeVisible();

    await page.evaluate(
      (key) => window.localStorage.removeItem(key),
      WORKSPACE_STORAGE_KEY,
    );
    await page.reload();

    await expect(
      page.getByRole("heading", { name: /Start|Create|New/ }).first(),
    ).toBeVisible();
  });
});

test.describe("One workspace name", () => {
  test("a rename in one studio shows in the other", async ({ page }) => {
    await seedBoth(page);
    await page.goto("/typography");
    await expect(
      page.getByRole("region", { name: "Type scale settings" }),
    ).toBeVisible();

    // Migration took the palette name, so the scale opens under it.
    const typographyName = page.getByLabel("Project name");
    await expect(typographyName).toHaveValue("My colour system");

    await typographyName.fill("Brand system");
    await typographyName.blur();

    await page.goto("/");
    await expect(page.getByLabel("Project name")).toHaveValue("Brand system");
  });

  test("the renamed workspace reaches both slices, not just the topbar", async ({
    page,
  }) => {
    await seedBoth(page);
    await page.goto("/");
    await expect(
      page.getByRole("region", { name: "Palette toolbar" }),
    ).toBeVisible();

    await page.getByLabel("Project name").fill("Renamed");
    await page.getByLabel("Project name").blur();
    // Visit the other studio so it adopts and writes the name back down.
    await page.goto("/typography");
    await expect(
      page.getByRole("region", { name: "Type scale settings" }),
    ).toBeVisible();

    const workspace = await readWorkspace(page);
    expect(workspace.name).toBe("Renamed");
    // The slices carry it too, since the exports read them.
    expect(workspace.palette.name).toBe("Renamed");
    expect(workspace.typography.system.name).toBe("Renamed");
  });
});
