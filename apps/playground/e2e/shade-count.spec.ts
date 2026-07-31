import { expect, test } from "./fixtures";

test.describe("Shade count", () => {
  test("starts at 20 shades with the Blueprint 20 badge", async ({
    seededPage: page,
  }) => {
    await expect(page.getByLabel("Shade count", { exact: true })).toHaveValue(
      "20",
    );
    await expect(
      page.getByRole("region", { name: "Palette toolbar" }).getByText("Blueprint 20"),
    ).toBeVisible();
    await expect(page.getByLabel(/target lightness$/)).toHaveCount(20);
  });

  test("the + button adds a shade and regenerates the matrix", async ({
    seededPage: page,
  }) => {
    await page.getByRole("button", { name: "Add one shade" }).click();

    await expect(page.getByLabel("Shade count", { exact: true })).toHaveValue(
      "21",
    );
    await expect(page.getByText("21 shades", { exact: true })).toBeVisible();
    await expect(page.getByLabel(/target lightness$/)).toHaveCount(21);
  });

  test("the − button removes a shade", async ({ seededPage: page }) => {
    await page.getByRole("button", { name: "Remove one shade" }).click();

    await expect(page.getByLabel("Shade count", { exact: true })).toHaveValue(
      "19",
    );
    await expect(page.getByLabel(/target lightness$/)).toHaveCount(19);
  });

  test("typing a shade count resizes the matrix", async ({
    seededPage: page,
  }) => {
    const shadeCountInput = page.getByLabel("Shade count", { exact: true });
    await shadeCountInput.fill("10");
    await shadeCountInput.blur();

    await expect(page.getByText("10 shades", { exact: true })).toBeVisible();
    await expect(page.getByLabel(/target lightness$/)).toHaveCount(10);
  });

  test("cannot go below the 2-shade minimum", async ({
    seededPage: page,
  }) => {
    const shadeCountInput = page.getByLabel("Shade count", { exact: true });
    await shadeCountInput.fill("2");
    await shadeCountInput.blur();

    await expect(
      page.getByRole("button", { name: "Remove one shade" }),
    ).toBeDisabled();
    await expect(page.getByLabel(/target lightness$/)).toHaveCount(2);
  });
});
