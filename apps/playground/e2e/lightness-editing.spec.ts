import { expect, test } from "./fixtures";

test.describe("Lightness editing", () => {
  test("editing a percentage input updates the value and switches to Custom", async ({
    seededPage: page,
  }) => {
    const input = page.getByLabel("500 lightness percent", { exact: true });
    await input.fill("48");
    await input.blur();

    await expect(input).toHaveValue("48");
    await expect(page.getByRole("radio", { name: "Custom" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  test("a percentage input cannot cross its neighbour", async ({
    seededPage: page,
  }) => {
    // 550 sits at 45%; 500 sits at 50% and must stay above it.
    const input = page.getByLabel("550 lightness percent", { exact: true });
    await input.fill("90");
    await input.blur();

    const neighbourValue = Number(
      await page.getByLabel("500 lightness percent", { exact: true }).inputValue(),
    );
    const value = Number(await input.inputValue());

    expect(value).toBeLessThan(neighbourValue);
  });

  test("Reset preset restores the Blueprint 20 values", async ({
    seededPage: page,
  }) => {
    const input = page.getByLabel("500 lightness percent", { exact: true });
    await input.fill("48");
    await input.blur();
    await expect(input).toHaveValue("48");

    await page.getByRole("button", { name: "Reset preset" }).click();

    await expect(input).toHaveValue("50");
  });
});
