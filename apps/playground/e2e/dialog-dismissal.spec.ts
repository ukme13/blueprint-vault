import { createWorkspaceFromHome, expect, test } from "./fixtures";

/**
 * Clicking the backdrop closes a dialog.
 *
 * Astryx's `purpose` decides this: `form` blocks the backdrop once something
 * has been typed, `info` allows it. These dialogs hold a name or a setting
 * that costs a second to redo, so they are `info`. The delete confirmation is
 * an AlertDialog and deliberately not in this list.
 */
test.describe("Dialog dismissal", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    await page.reload();
    await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
  });

  test("the backdrop closes New project, even after typing", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "New project" }).click();
    const dialog = page.getByRole("dialog", { name: "New project" });
    await expect(dialog).toBeVisible();

    /* Typing first is the case `purpose="form"` used to block. */
    await dialog.getByLabel("Project name").fill("Abandoned");
    await page.mouse.click(4, 4);

    await expect(dialog).toBeHidden();
    /* Dismissing is not creating. */
    await expect(page.getByText("You have 0 / 8 projects.")).toBeVisible();
  });

  test("the backdrop closes Rename", async ({ page }) => {
    await createWorkspaceFromHome(page, "First system");
    await page.goto("/");

    await page.getByRole("button", { name: "Rename First system" }).click();
    const dialog = page.getByRole("dialog", { name: "Rename project" });
    await expect(dialog).toBeVisible();

    await dialog.getByLabel("Project name").fill("Never applied");
    await page.mouse.click(4, 4);

    await expect(dialog).toBeHidden();
    await expect(page.getByText("First system")).toBeVisible();
  });
});
