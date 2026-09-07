import { expect, test } from "./fixtures";

for (const width of [1280, 1024]) {
  for (const mode of ["Light", "Dark"] as const) {
    test(`alpha table visual check at ${width}px in ${mode.toLowerCase()} mode`, async ({
      seededPage: page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.getByRole("radio", { name: mode }).click();
      await page.getByRole("button", { name: "Semantics" }).click();
      const editor = page.getByRole("region", { name: "Semantic tokens" });
      await expect(editor).toBeVisible();
      await editor
        .getByRole("navigation", { name: "Token groups" })
        .getByRole("listitem")
        .filter({ hasText: "Borders" })
        .click();
      await expect(
        editor
          .getByRole("button", { name: /edit border subtle light/i })
          .locator("[data-transparent]"),
      ).toBeVisible();
      await expect(
        editor.getByRole("textbox", {
          name: /border default light transparency/i,
        }),
      ).toHaveValue("100%");
      await expect(page.locator("html")).toHaveScreenshot(
        `semantic-alpha-${mode.toLowerCase()}-${width}.png`,
        { animations: "disabled" },
      );
    });
  }
}
