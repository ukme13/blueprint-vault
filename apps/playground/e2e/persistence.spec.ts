import { PROJECT_STORAGE_KEY, expect, test } from "./fixtures";

test.describe("Persistence after reload", () => {
  test("shade count and pattern changes survive a reload", async ({
    seededPage: page,
  }) => {
    const shadeCountInput = page.getByLabel("Shade count", { exact: true });
    await shadeCountInput.fill("12");
    await shadeCountInput.blur();
    await expect(shadeCountInput).toHaveValue("12");

    await page.reload();

    await expect(page.getByLabel("Shade count", { exact: true })).toHaveValue(
      "12",
    );
    await expect(page.getByLabel(/target lightness$/)).toHaveCount(12);
  });

  test("an edited lightness percentage survives a reload", async ({
    seededPage: page,
  }) => {
    const input = page.getByLabel("500 lightness percent", { exact: true });
    await input.fill("48");
    await input.blur();
    await expect(input).toHaveValue("48");

    await page.reload();

    await expect(
      page.getByLabel("500 lightness percent", { exact: true }),
    ).toHaveValue("48");
  });

  test("a renamed colour track survives a reload", async ({
    seededPage: page,
  }) => {
    // Anchored by CSS-module class rather than accessible label: the label
    // text tracks the track name and changes on every keystroke, which would
    // make a getByLabel locator go stale mid-rename.
    const nameInput = page.locator('[class*="trackNameInput"] input').first();
    await nameInput.fill("brand");
    await nameInput.blur();

    await page.reload();

    await expect(
      page.locator('[class*="trackNameInput"] input').first(),
    ).toHaveValue("brand");
  });

  test("stores the project under the expected localStorage key", async ({
    seededPage: page,
  }) => {
    const stored = await page.evaluate(
      (key) => window.localStorage.getItem(key),
      PROJECT_STORAGE_KEY,
    );

    expect(stored).not.toBeNull();
    const project = JSON.parse(stored!);
    expect(project.name).toBe("My colour system");
    expect(project.lightnessValues).toHaveLength(20);
  });
});
