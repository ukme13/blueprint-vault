import type { Page } from "@playwright/test";
import { expect, test } from "./scale-fixtures";
import { fillHybridNumber } from "./typography-fixtures";

/**
 * The block inset sets a button's height: the Uses table says what it comes
 * to, and the preview page draws it.
 */
const INSET_LABEL = "Control block inset on Desktop";

const heightHint = (page: Page) =>
  page
    .getByRole("region", { name: "Spacing uses" })
    .locator('[data-row-hint="inset-control-y"]');

/** The pixel value in a hint such as `Button: ~34px`; the first when there are several. */
async function hintedPx(page: Page): Promise<number> {
  const text = (await heightHint(page).textContent()) ?? "";
  const match = /~(\d+)px/.exec(text);
  if (!match) throw new Error(`No height in the hint: ${text}`);
  return Number(match[1]);
}

async function openUses(page: Page) {
  await page
    .getByRole("navigation", { name: "Scale sections" })
    .getByRole("button", { name: "Uses" })
    .click();
  const uses = page.getByRole("region", { name: "Spacing uses" });
  await expect(uses).toBeVisible();
  return uses;
}

const blurFocus = (page: Page) =>
  page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());

test.describe("Button height from the control insets", () => {
  test("hints the button height under the block inset, and only there", async ({
    seededPage: page,
  }) => {
    const uses = await openUses(page);
    /* The standard button alone, not one height for every size. */
    await expect(heightHint(page)).toHaveText(/^Button: ~\d+px(?: \(md\))?$/);
    await expect(uses.locator("[data-row-hint]")).toHaveCount(1);
    /* Under the variable, inside the token's own cell. */
    await expect(
      uses.locator('[data-token="inset-control-y"] [data-row-hint]'),
    ).toHaveCount(1);
  });

  test("grows with the inset as it is edited", async ({ seededPage: page }) => {
    await openUses(page);
    const before = await hintedPx(page);

    /* Four pixels more inset is eight more in the button: both edges. */
    await fillHybridNumber(page, INSET_LABEL, "12");
    await expect.poll(() => hintedPx(page)).toBe(before + 8);
  });

  test("shrinks with the inset as it is edited", async ({
    seededPage: page,
  }) => {
    await openUses(page);
    const before = await hintedPx(page);

    /* One edit to a field per test: a second fill on a typed value
       appended to it under load ("12" then "6" read 126). */
    await fillHybridNumber(page, INSET_LABEL, "6");
    await expect.poll(() => hintedPx(page)).toBe(before - 4);
  });

  test("draws the same button on the preview page", async ({
    seededPage: page,
  }) => {
    await openUses(page);
    await fillHybridNumber(page, INSET_LABEL, "12");
    await fillHybridNumber(page, "Control inline inset on Desktop", "20");
    const hinted = await hintedPx(page);

    await blurFocus(page);
    await page.keyboard.press("Space");
    await expect(page).toHaveURL(/\/preview/);

    const button = page.getByRole("button", { name: "Sign up" });
    await expect(button).toBeVisible();
    /* The insets, not the size class's fixed padding and height. */
    await expect(button).toHaveCSS("padding-top", "12px");
    await expect(button).toHaveCSS("padding-bottom", "12px");
    await expect(button).toHaveCSS("padding-left", "20px");
    await expect(button).toHaveCSS("padding-right", "20px");
    const height = (await button.boundingBox())!.height;
    expect(Math.abs(height - hinted)).toBeLessThanOrEqual(1);
  });
});
