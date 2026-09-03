import { expect, test } from "./typography-fixtures";

/*
 * The studio-wide theme switch.
 *
 * What is measured is a surface the chrome paints from the semantic layer,
 * because that is the whole point: a raw primitive is one fixed value, and
 * only a role can hold a light one and a dark one. The attribute on <html>
 * is checked too, since the pre-paint script in the layout reads storage and
 * writes exactly that.
 */

const topbarBackground = (page: import("@playwright/test").Page) =>
  page
    .getByRole("region", { name: "Type scale settings" })
    .evaluate((el) => getComputedStyle(el).backgroundColor);

const pick = (page: import("@playwright/test").Page, mode: string) =>
  page
    .getByRole("radiogroup", { name: "Theme" })
    .getByRole("radio", { name: mode })
    .click();

test.describe("The studio theme", () => {
  test("repaints the chrome, not just the controls", async ({
    seededPage: page,
  }) => {
    const dark = await topbarBackground(page);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await pick(page, "Light");

    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    /* The inspector is a CSS module painting `surface-subtle`. If this did
       not move, the sweep left a primitive behind. */
    await expect.poll(() => topbarBackground(page)).not.toBe(dark);
  });

  test("is remembered across a reload, before React runs", async ({
    seededPage: page,
  }) => {
    await pick(page, "Light");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    await page.reload();
    /* Read straight after navigation rather than after hydration: the layout's
       inline script is what sets this, and it runs before any React does. */
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(
      page
        .getByRole("radiogroup", { name: "Theme" })
        .getByRole("radio", { name: "Light" }),
    ).toBeChecked();
  });

  test("hands the choice to the operating system", async ({
    seededPage: page,
  }) => {
    await pick(page, "System");
    /* No attribute at all: `color-scheme` falls back to `light dark` and the
       browser decides, which is what Astryx's Theme does for this mode. */
    await expect(page.locator("html")).not.toHaveAttribute("data-theme");
  });
});
