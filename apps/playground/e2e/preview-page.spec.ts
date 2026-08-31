import { expect, seedProject, test } from "./fixtures";

/**
 * The demo page.
 *
 * See docs/roadmap/semantic-tokens.md. That the page reaches for no primitive
 * is checked at the source, in packages/ui — this covers that it renders from
 * the layer and answers to both modes.
 */

test.describe("The system preview", () => {
  test("draws itself from the seeded semantic layer", async ({ page }) => {
    await seedProject(page);
    await page.goto("/preview");

    await expect(
      page.getByRole("heading", { name: "A system you can hand over" }),
    ).toBeVisible();
    /* Twelve, because a workspace migrated from the old keys is seeded with
       the roles that were already in use. */
    await expect(page.getByText("Drawn from 12 semantic tokens")).toBeVisible();
  });

  test("answers to the mode toggle", async ({ page }) => {
    await seedProject(page);
    await page.goto("/preview");

    const page_ = page.getByRole("heading", {
      name: "A system you can hand over",
    });
    await expect(page_).toBeVisible();

    /* A token-driven element rather than a wrapper: the first div on the page
       belongs to the framework and is transparent either way. */
    const background = () =>
      page
        .getByRole("button", { name: "Primary action" })
        .evaluate((node) => getComputedStyle(node).backgroundColor);
    const light = await background();

    await page.getByRole("radio", { name: "Dark" }).click();
    await expect(page.getByText("in dark mode")).toBeVisible();

    /* The same token, a different primitive. A layer that held one value per
       name could not do this at all. */
    await expect.poll(background).not.toBe(light);
  });

  test("says so when there is no layer to draw", async ({ page }) => {
    await page.goto("/preview");
    await expect(
      page.getByRole("heading", { name: "Nothing to preview yet" }),
    ).toBeVisible();
  });
});
