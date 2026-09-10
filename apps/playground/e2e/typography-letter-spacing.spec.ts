import { expect, showInspectorPanel, test } from "./typography-fixtures";

/**
 * Letter-spacing follows the same unlink/relink rule as line-height: typing
 * on one preview device pins that frame and leaves the shared value on the
 * rest. Clearing the override puts the frame back on the shared number.
 */

const LETTER_SPACING = "body letter spacing";

const letterSpacingField = (page: import("@playwright/test").Page) =>
  page.getByRole("spinbutton", { name: LETTER_SPACING });

const storedTracking = (page: import("@playwright/test").Page) =>
  page.evaluate(() => {
    const raw = window.localStorage.getItem("blueprint.workspace.v1");
    if (!raw) return null;
    const roles = JSON.parse(raw).typography.system.roles as {
      id: string;
      letterSpacingPx: number;
      unlinkedLetterSpacings?: Record<string, number>;
    }[];
    const body = roles.find((role) => role.id === "body");
    if (!body) return null;
    return body.unlinkedLetterSpacings?.desktop ?? body.letterSpacingPx;
  });

const storedSharedTracking = (page: import("@playwright/test").Page) =>
  page.evaluate(() => {
    const raw = window.localStorage.getItem("blueprint.workspace.v1");
    if (!raw) return null;
    const roles = JSON.parse(raw).typography.system.roles as {
      id: string;
      letterSpacingPx: number;
    }[];
    return roles.find((role) => role.id === "body")?.letterSpacingPx ?? null;
  });

const unlinkedMarker = (page: import("@playwright/test").Page) =>
  page.locator("[data-unlinked='true']").filter({
    has: letterSpacingField(page),
  });

test.describe("The letter-spacing field", () => {
  test.beforeEach(async ({ seededPage: page }) => {
    await showInspectorPanel(page, "Groups");
  });

  test("typing tracking on phone leaves desktop on the shared value", async ({
    seededPage: page,
  }) => {
    const field = letterSpacingField(page);
    const devices = page.getByRole("navigation", { name: "Preview devices" });

    await devices.getByRole("button", { name: "Phone" }).click();
    await field.fill("0.5");
    await field.blur();
    await expect(field).toHaveValue("0.5");
    await expect(unlinkedMarker(page)).toBeVisible();

    await devices.getByRole("button", { name: "Desktop", exact: true }).click();
    await expect(field).toHaveValue("0");
    await expect(unlinkedMarker(page)).toHaveCount(0);
    await expect.poll(() => storedSharedTracking(page)).toBe(0);
  });

  test("clearing an override restores the shared tracking", async ({
    seededPage: page,
  }) => {
    const field = letterSpacingField(page);

    await field.fill("0.5");
    await field.blur();
    await expect(unlinkedMarker(page)).toBeVisible();

    await page.getByRole("button", { name: `Clear ${LETTER_SPACING}` }).click();
    await expect(field).toHaveValue("0");
    await expect(unlinkedMarker(page)).toHaveCount(0);
    await expect.poll(() => storedSharedTracking(page)).toBe(0);
    await expect.poll(() => storedTracking(page)).toBe(0);
  });
});
