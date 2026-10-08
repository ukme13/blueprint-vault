import type { Page } from "@playwright/test";
import { readStoredWorkspace } from "./fixtures";
import { openPreview } from "./preview-fixtures";
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

    /* Undone from inside it: first the spacing edit, which takes the person
       to Spacing where it was made, then the role, which brings them back. */
    await blurFocus(page);
    await page.keyboard.press("ControlOrMeta+z");
    await expect.poll(() => storedSteps(page)).toContain(10);
    await expect(page).toHaveURL(/\/spacing/);

    await page.keyboard.press("ControlOrMeta+z");
    await expect(page).toHaveURL(/\/typography/);
    await showInspectorPanel(page, "Groups");
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

  test("hands the undo back to the studio the edit was made in", async ({
    seededPage: page,
  }) => {
    await showInspectorPanel(page, "Groups");
    const before = await storedRoles(page);
    await page.getByRole("button", { name: "Add a role to Body" }).click();
    await expect.poll(() => storedRoles(page)).toBe(before + 1);

    /* Undone from Spacing, it takes the person back to where it was made. */
    await studioLink(page, "Spacing").click();
    await expect(page).toHaveURL(/\/spacing/);
    await page.keyboard.press("ControlOrMeta+z");
    await expect(page).toHaveURL(/\/typography/);
    await expect.poll(() => storedRoles(page)).toBe(before);

    /* And so does a redo, from a studio that had nothing to do with it. */
    await studioLink(page, "Radius").click();
    await expect(page).toHaveURL(/\/radius/);
    await page.keyboard.press("ControlOrMeta+Shift+z");
    await expect(page).toHaveURL(/\/typography/);
    await expect.poll(() => storedRoles(page)).toBe(before + 1);
  });

  test("the toast offers the way back: Redo after an undo, Undo after a redo", async ({
    seededPage: page,
  }) => {
    await showInspectorPanel(page, "Groups");
    const before = await storedRoles(page);
    await page.getByRole("button", { name: "Add a role to Body" }).click();
    await expect.poll(() => storedRoles(page)).toBe(before + 1);
    await blurFocus(page);

    const toast = page.locator(".astryx-toast");
    await page.keyboard.press("ControlOrMeta+z");
    await expect.poll(() => storedRoles(page)).toBe(before);
    await expect(toast).toContainText("Undid edit in Typography");
    await expect(toast.getByRole("button", { name: "Undo" })).toHaveCount(0);

    /* Redo, from the toast: the edit is back, and the line says so. */
    await toast.getByRole("button", { name: "Redo" }).click();
    await expect.poll(() => storedRoles(page)).toBe(before + 1);
    await expect(toast).toContainText("Redid edit in Typography");
    await expect(toast.getByRole("button", { name: "Redo" })).toHaveCount(0);

    /* And Undo, from that one, takes it away again. */
    await toast.getByRole("button", { name: "Undo" }).click();
    await expect.poll(() => storedRoles(page)).toBe(before);
    await expect(toast).toContainText("Undid edit in Typography");
  });

  test("stays put when the edit was made in the studio already open", async ({
    seededPage: page,
  }) => {
    await showInspectorPanel(page, "Groups");
    const before = await storedRoles(page);
    await page.getByRole("button", { name: "Add a role to Body" }).click();
    await expect.poll(() => storedRoles(page)).toBe(before + 1);
    await blurFocus(page);
    await page.keyboard.press("ControlOrMeta+z");
    await expect.poll(() => storedRoles(page)).toBe(before);
    await expect(page).toHaveURL(/\/typography/);
  });

  test("returns to the Preview for an edit made from its spacing tags", async ({
    page,
  }) => {
    await openPreview(page);
    await page.getByRole("button", { name: "Show spacing" }).click();
    const stored = async () =>
      (await readStoredWorkspace(page)).layout.find(
        (token: { id: string }) => token.id === "inset-card",
      )?.byDevice.desktop as string;
    const original = await stored();

    await page
      .getByRole("group", { name: "Spacing overlay" })
      .locator('[data-spacing-badge="inset-card"]')
      .first()
      .click();
    await page
      .getByRole("tab", { name: "Steps" })
      .filter({ visible: true })
      .click();
    await page
      .getByRole("listbox", { name: "Card inset on Desktop" })
      .filter({ visible: true })
      .getByRole("option", { name: /^--spacing-12\b/ })
      .click();
    await expect.poll(stored).toBe("12");

    /* A layout use is Spacing's, but this one was set on the Preview. */
    await studioLink(page, "Spacing").click();
    await expect(page).toHaveURL(/\/spacing/);
    await page.keyboard.press("ControlOrMeta+z");
    await expect(page).toHaveURL(/\/preview/);
    await expect.poll(stored).toBe(original);
  });
});

test.describe("The undo keys", () => {
  /* Pressed as the browser reports them under a Thai layout, where the Z key
     types ผ: `key` names the letter, `code` the position of the key. */
  const press = (
    page: Page,
    init: { key: string; code: string; shiftKey?: boolean },
  ) =>
    page.evaluate((keys) => {
      document.body.dispatchEvent(
        new KeyboardEvent("keydown", {
          ...keys,
          ctrlKey: true,
          bubbles: true,
          cancelable: true,
        }),
      );
    }, init);

  test("undo and redo work on a Thai keyboard, and Ctrl+Y redoes", async ({
    seededPage: page,
  }) => {
    await showInspectorPanel(page, "Groups");
    const before = await storedRoles(page);
    await page.getByRole("button", { name: "Add a role to Body" }).click();
    await expect.poll(() => storedRoles(page)).toBe(before + 1);
    await blurFocus(page);

    await press(page, { key: "ผ", code: "KeyZ" });
    await expect.poll(() => storedRoles(page)).toBe(before);

    await press(page, { key: "ผ", code: "KeyZ", shiftKey: true });
    await expect.poll(() => storedRoles(page)).toBe(before + 1);

    await press(page, { key: "ผ", code: "KeyZ" });
    await expect.poll(() => storedRoles(page)).toBe(before);
    await page.keyboard.press("Control+y");
    await expect.poll(() => storedRoles(page)).toBe(before + 1);
  });
});
