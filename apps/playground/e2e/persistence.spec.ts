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
    await page
      .getByRole("button", { name: "Open primary colour details" })
      .press("Enter");
    const colourDialog = page.locator("dialog").filter({
      has: page.getByLabel("Colour name"),
    });
    await colourDialog.getByLabel("Colour name").fill("brand");
    await colourDialog.getByRole("button", { name: "Save changes" }).click();

    await page.reload();

    await expect(
      page.getByRole("button", { name: "Open brand colour details" }),
    ).toBeVisible();
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
