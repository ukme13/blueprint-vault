import type { Page } from "@playwright/test";
import { readStoredWorkspace } from "./fixtures";
import { openSpacingSteps } from "./scale-fixtures";
import { expect, showInspectorPanel, test } from "./typography-fixtures";

/**
 * One undo history for the workspace. It lives in the store, above every
 * studio, so it outlasts moving between them: an edit made in Typography is
 * undone from Spacing.
 */
const studioLink = (page: Page, name: string) =>
  page.getByRole("link", { name, exact: true });

const weights = (page: Page) =>
  page
    .getByRole("region", { name: "Type scale settings" })
    .getByLabel(/ font weight$/);

/** The role count in the stored document, whichever studio is open. */
const storedRoles = async (page: Page) =>
  (await readStoredWorkspace(page)).typography.system.roles.length as number;

const storedSteps = async (page: Page) =>
  (await readStoredWorkspace(page)).spacing.steps as number[];

/** Focus to the page, as after a control that has gone. */
const blurFocus = (page: Page) =>
  page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());

const keepStep = (page: Page) =>
  page.getByRole("button", { name: "Keep step 10", exact: true });

test.describe("Undo across studios", () => {
  test("undoes a spacing edit, then the typography edit made before it", async ({
    seededPage: page,
  }) => {
    /* 1. A typography edit. */
    await showInspectorPanel(page, "Groups");
    const rolesBefore = await storedRoles(page);
    await page.getByRole("button", { name: "Add a role to Body" }).click();
    await expect.poll(() => storedRoles(page)).toBe(rolesBefore + 1);

    /* 2. Another studio, and an edit there. */
    await studioLink(page, "Spacing").click();
    await expect(page).toHaveURL(/\/spacing/);
    await openSpacingSteps(page);
    await expect(keepStep(page)).toHaveAttribute("aria-pressed", "true");
    await keepStep(page).click();
    await expect(keepStep(page)).toHaveAttribute("aria-pressed", "false");
    await expect.poll(() => storedSteps(page)).not.toContain(10);

    /* 3. The latest edit is undone first: the spacing one. */
    await page.keyboard.press("ControlOrMeta+z");
    await expect(keepStep(page)).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => storedSteps(page)).toContain(10);
    expect(await storedRoles(page)).toBe(rolesBefore + 1);

    /* 4. And again: the typography edit from the studio left behind. */
    await page.keyboard.press("ControlOrMeta+z");
    await expect.poll(() => storedRoles(page)).toBe(rolesBefore);

    /* Back in Typography, the role is gone from what it shows. */
    await studioLink(page, "Typography").click();
    await showInspectorPanel(page, "Groups");
    await expect(weights(page)).toHaveCount(rolesBefore);

    /* Redo, from a studio that never made the edit, puts it back. */
    await studioLink(page, "Spacing").click();
    await page.keyboard.press("ControlOrMeta+Shift+z");
    await expect.poll(() => storedRoles(page)).toBe(rolesBefore + 1);
  });

  test("refreshes a studio that is open when its edit is undone", async ({
    seededPage: page,
  }) => {
    await showInspectorPanel(page, "Groups");
    const before = await weights(page).count();
    await page.getByRole("button", { name: "Add a role to Body" }).click();
    await expect(weights(page)).toHaveCount(before + 1);

    /* Away and back: this Typography is a new one, holding the added role. */
    await studioLink(page, "Spacing").click();
    await openSpacingSteps(page);
    await keepStep(page).click();
    await studioLink(page, "Typography").click();
    await showInspectorPanel(page, "Groups");
    await expect(weights(page)).toHaveCount(before + 1);

    /* Undone from inside it: first the spacing edit, then its own. */
    await blurFocus(page);
    await page.keyboard.press("ControlOrMeta+z");
    await expect.poll(() => storedSteps(page)).toContain(10);
    await expect(weights(page)).toHaveCount(before + 1);

    await page.keyboard.press("ControlOrMeta+z");
    await expect(weights(page)).toHaveCount(before);
  });

  test("survives undos pressed in quick succession", async ({
    seededPage: page,
  }) => {
    /* The open studio re-reads its slice after each undo. A second press
       landing before that is done must not be overwritten by the first's
       stale copy, or held-down Ctrl+Z would stop partway. */
    await showInspectorPanel(page, "Groups");
    const before = await storedRoles(page);
    const add = page.getByRole("button", { name: "Add a role to Body" });
    await add.click();
    await add.click();
    await expect.poll(() => storedRoles(page)).toBe(before + 2);
    await blurFocus(page);

    await page.keyboard.press("ControlOrMeta+z");
    await page.keyboard.press("ControlOrMeta+z");
    await expect.poll(() => storedRoles(page)).toBe(before);
    await expect(weights(page)).toHaveCount(before);

    /* And forward again, as fast. */
    await page.keyboard.press("ControlOrMeta+Shift+z");
    await page.keyboard.press("ControlOrMeta+Shift+z");
    await expect.poll(() => storedRoles(page)).toBe(before + 2);
    await expect(weights(page)).toHaveCount(before + 2);
  });

  test("leaves what an undo does not own as it now is", async ({
    seededPage: page,
  }) => {
    /* A typography edit, then a rename: undoing the edit must not undo the
       name, which is not part of any step. */
    await showInspectorPanel(page, "Groups");
    const rolesBefore = await storedRoles(page);
    await page.getByRole("button", { name: "Add a role to Body" }).click();
    await expect.poll(() => storedRoles(page)).toBe(rolesBefore + 1);

    const name = page.getByLabel("Project name");
    await name.fill("Renamed project");
    await name.press("Enter");
    await expect
      .poll(async () => (await readStoredWorkspace(page)).name)
      .toBe("Renamed project");

    await blurFocus(page);
    await page.keyboard.press("ControlOrMeta+z");
    await expect.poll(() => storedRoles(page)).toBe(rolesBefore);
    expect((await readStoredWorkspace(page)).name).toBe("Renamed project");
  });

  test("has nothing to undo on a fresh workspace", async ({
    seededPage: page,
  }) => {
    const rolesBefore = await storedRoles(page);
    await studioLink(page, "Spacing").click();
    await page.keyboard.press("ControlOrMeta+z");
    /* Opening a studio is not an edit: nothing to take back. */
    expect(await storedRoles(page)).toBe(rolesBefore);
    await openSpacingSteps(page);
    await expect(keepStep(page)).toHaveAttribute("aria-pressed", "true");
  });
});
