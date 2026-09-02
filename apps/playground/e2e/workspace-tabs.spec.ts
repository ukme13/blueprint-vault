import { expect, test, type Page } from "@playwright/test";
import {
  PROJECT_STORAGE_KEY,
  WORKSPACE_STORAGE_KEY,
  defaultProject,
} from "./fixtures";
import {
  TYPOGRAPHY_STORAGE_KEY,
  defaultTypographyProject,
  showInspectorPanel,
} from "./typography-fixtures";

/**
 * Two tabs, one workspace.
 *
 * Pages in the same context share localStorage, which is what makes these real
 * tabs rather than two browsers. The hazard the merge introduced is that a
 * studio holds its half in memory from page load: if it persists that copy, it
 * writes back a stale version of the half it does not own.
 */

async function seed(page: Page) {
  await page.addInitScript(
    ({ paletteKey, palette, typeKey, type }) => {
      if (window.sessionStorage.getItem("blueprint.e2e-seeded.tabs")) return;
      window.sessionStorage.setItem("blueprint.e2e-seeded.tabs", "1");
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

const readWorkspace = (page: Page) =>
  page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, WORKSPACE_STORAGE_KEY);

test.describe("Two tabs on one workspace", () => {
  test("a palette edit does not roll back a type scale edited next door", async ({
    context,
  }) => {
    const paletteTab = await context.newPage();
    await seed(paletteTab);
    await paletteTab.goto("/");
    await expect(
      paletteTab.getByRole("region", { name: "Palette toolbar" }),
    ).toBeVisible();

    // Second tab, opened while the first is holding its own copy in memory.
    const typeTab = await context.newPage();
    await typeTab.goto("/typography");
    await expect(
      typeTab.getByRole("region", { name: "Type scale settings" }),
    ).toBeVisible();

    await showInspectorPanel(typeTab, "Groups");
    await typeTab.getByLabel("body font weight").fill("700");
    await typeTab.getByLabel("body font weight").blur();
    await expect
      .poll(
        async () =>
          (await readWorkspace(typeTab)).typography.system.roles.find(
            (role: { id: string }) => role.id === "body",
          ).fontWeight,
      )
      .toBe(700);

    // Now the older tab saves. It loaded before that weight existed.
    await paletteTab.getByLabel("Project name").fill("Edited in tab one");
    await paletteTab.getByLabel("Project name").blur();
    await expect
      .poll(async () => (await readWorkspace(paletteTab)).name)
      .toBe("Edited in tab one");

    const workspace = await readWorkspace(paletteTab);
    // The re-read before writing is what has to save this.
    expect(
      workspace.typography.system.roles.find(
        (role: { id: string }) => role.id === "body",
      ).fontWeight,
    ).toBe(700);
  });

  test("a type scale edit does not roll back a palette edited next door", async ({
    context,
  }) => {
    const typeTab = await context.newPage();
    await seed(typeTab);
    await typeTab.goto("/typography");
    await expect(
      typeTab.getByRole("region", { name: "Type scale settings" }),
    ).toBeVisible();

    const paletteTab = await context.newPage();
    await paletteTab.goto("/");
    await expect(
      paletteTab.getByRole("region", { name: "Palette toolbar" }),
    ).toBeVisible();

    await paletteTab.getByLabel("Project name").fill("Renamed next door");
    await paletteTab.getByLabel("Project name").blur();
    await expect
      .poll(async () => (await readWorkspace(paletteTab)).name)
      .toBe("Renamed next door");

    await showInspectorPanel(typeTab, "Groups");
    await typeTab.getByLabel("body font weight").fill("300");
    await typeTab.getByLabel("body font weight").blur();
    await expect
      .poll(
        async () =>
          (await readWorkspace(typeTab)).typography.system.roles.find(
            (role: { id: string }) => role.id === "body",
          ).fontWeight,
      )
      .toBe(300);

    const workspace = await readWorkspace(typeTab);
    expect(workspace.palette).not.toBeNull();
    expect(workspace.palette.tracks.length).toBeGreaterThan(0);
    /* The name is the half the re-read cannot save on its own: this tab
       adopted it at load, so its own copy is now stale. */
    expect(workspace.name).toBe("Renamed next door");
  });
});
