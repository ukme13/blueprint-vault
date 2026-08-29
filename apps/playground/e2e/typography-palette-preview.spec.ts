import { expect, test, type Page } from "@playwright/test";
import { PROJECT_STORAGE_KEY, defaultProject } from "./fixtures";
import {
  TYPOGRAPHY_STORAGE_KEY,
  defaultTypographyProject,
} from "./typography-fixtures";

async function seed(page: Page, withPalette: boolean) {
  await page.addInitScript(
    ({ pk, p, tk, t, palette }) => {
      if (palette) window.localStorage.setItem(pk, JSON.stringify(p));
      window.localStorage.setItem(tk, JSON.stringify(t));
    },
    {
      pk: PROJECT_STORAGE_KEY,
      p: defaultProject(),
      tk: TYPOGRAPHY_STORAGE_KEY,
      t: defaultTypographyProject(),
      palette: withPalette,
    },
  );
  await page.goto("/typography");
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Type scale preview" }),
  ).toBeVisible();
}

const pick = async (page: Page, label: string, shade: string) => {
  await page.getByLabel(label).click();
  await page.getByRole("option", { name: shade, exact: true }).click();
};

test.describe("Preview against the real palette", () => {
  test("offers the workspace palette rather than a colour picker", async ({
    page,
  }) => {
    await seed(page, true);
    await page.getByLabel("Text colour").click();
    // Tracks and shades from the palette half of the same workspace.
    await expect(
      page.getByRole("option", { name: "primary 500", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("option", { name: "neutral 950", exact: true }),
    ).toBeVisible();
  });

  test("reports the contrast for the chosen pair", async ({ page }) => {
    await seed(page, true);
    await pick(page, "Text colour", "neutral 950");
    await pick(page, "Background colour", "neutral 50");

    const preview = page.getByRole("region", { name: "Type scale preview" });
    const first = preview.locator("[data-status]").first();
    await expect(first).toContainText(":1");
    await expect(first).toHaveAttribute("data-status", "pass");
  });

  test("one pair passes at a heading and fails at body, because size decides", async ({
    page,
  }) => {
    await seed(page, true);
    // Deliberately marginal: over 3:1 but under 4.5:1.
    await pick(page, "Text colour", "neutral 400");
    await pick(page, "Background colour", "neutral 50");

    const preview = page.getByRole("region", { name: "Type scale preview" });
    const verdicts = preview.locator("[data-status]");

    // Display is 48px 700, which WCAG counts as large text.
    await expect(verdicts.first()).toHaveAttribute("data-status", "pass");
    await expect(verdicts.first()).toContainText("large text");

    // Body is 16px 400, and the same colours are not enough for it.
    const body = preview.locator("article", { hasText: "body" }).first();
    await expect(body.locator("[data-status]")).toHaveAttribute(
      "data-status",
      "fail",
    );
    await expect(body.locator("[data-status]")).toContainText("4.5:1");
  });

  test("shows the picked background rather than the studio's own", async ({
    page,
  }) => {
    await seed(page, true);
    await pick(page, "Text colour", "neutral 950");
    await pick(page, "Background colour", "neutral 50");

    /* The role cards paint their own surface by default, which would hide the
       choice and preview the text on studio chrome. */
    const card = page
      .getByRole("region", { name: "Type scale preview" })
      .locator("article")
      .first();
    await expect
      .poll(() => card.evaluate((el) => getComputedStyle(el).backgroundColor))
      .toBe("rgba(0, 0, 0, 0)");
  });

  test("says what to do when the workspace has no palette", async ({
    page,
  }) => {
    await seed(page, false);
    await expect(
      page.getByText(
        "Create a palette to preview this scale on your own colours.",
      ),
    ).toBeVisible();
    await expect(page.getByLabel("Text colour")).toHaveCount(0);
  });
});
