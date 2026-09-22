import { expect, readStoredWorkspace, test } from "./fixtures";

/**
 * Home create with a starting point.
 *
 * The selectors here are the ones every other spec reaches a studio through:
 * the dialog is "New project", the field is "Project name", the button is
 * "Create workspace". A change that renames any of them breaks most of the
 * suite, so they are asserted rather than assumed.
 */
test.describe("Project presets", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    await page.reload();
    await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
  });

  test("opens on the studio's own seed", async ({ page }) => {
    await page.getByRole("button", { name: "New project" }).click();
    const dialog = page.getByRole("dialog", { name: "New project" });

    await expect(dialog.getByLabel("Project name")).toBeVisible();
    await expect(
      dialog.getByRole("radio", { name: "Blueprint seed" }),
    ).toBeChecked();
    await expect(
      dialog.getByRole("button", { name: "Create workspace" }),
    ).toBeVisible();
  });

  test("the chosen preset decides the palette the workspace starts from", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "New project" }).click();
    const dialog = page.getByRole("dialog", { name: "New project" });

    await dialog.getByLabel("Project name").fill("Editorial");
    await dialog.getByRole("radio", { name: "Warm editorial" }).click();
    await dialog.getByRole("button", { name: "Create workspace" }).click();

    await expect(page).toHaveURL(/\/colour\/?$/);

    const stored = await readStoredWorkspace(page);
    const seedFor = (id: string) =>
      stored.palette.tracks.find((track: { id: string }) => track.id === id)
        ?.seedHex;

    expect(seedFor("primary")).toBe("#b4532a");
    expect(seedFor("secondary")).toBe("#3f6f5f");
    /* The preset chooses brand colour; the status hues are the studio's. */
    expect(seedFor("error")).toBe("#b02b1b");
    expect(stored.typography.system.ratio).toBeCloseTo(1.333, 3);
  });

  test("a refused create keeps the dialog open and says why", async ({
    page,
  }) => {
    /* One real workspace first, so there is a valid document to clone. */
    await page.getByRole("button", { name: "New project" }).click();
    const first = page.getByRole("dialog", { name: "New project" });
    await first.getByLabel("Project name").fill("First");
    await first.getByRole("button", { name: "Create workspace" }).click();
    await expect(page).toHaveURL(/\/colour\/?$/);

    await page.goto("/");
    await page.getByRole("button", { name: "New project" }).click();
    const dialog = page.getByRole("dialog", { name: "New project" });
    await dialog.getByLabel("Project name").fill("Ninth");

    /* Fill the library behind the open dialog, the way a second tab would.
       The button is disabled at capacity, so this is the only way in. */
    await page.evaluate(() => {
      const LIBRARY = "blueprint.library.v1";
      const raw = window.localStorage.getItem(LIBRARY);
      if (!raw) throw new Error("no library to fill");
      const index = JSON.parse(raw) as { currentId: string; ids: string[] };
      const document = window.localStorage.getItem(
        `blueprint.workspace.${index.currentId}`,
      );
      if (!document) throw new Error("no document to clone");

      const ids = [...index.ids];
      while (ids.length < 8) {
        const id = `filler-${ids.length}`;
        window.localStorage.setItem(`blueprint.workspace.${id}`, document);
        ids.push(id);
      }
      window.localStorage.setItem(LIBRARY, JSON.stringify({ ...index, ids }));
    });

    await dialog.getByRole("button", { name: "Create workspace" }).click();

    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("alert")).toContainText("8 projects");
    await expect(page).toHaveURL(/\/$/);
  });
});
