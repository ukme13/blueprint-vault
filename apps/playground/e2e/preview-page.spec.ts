import { expect, test } from "./fixtures";
import { openPreview } from "./preview-fixtures";

/**
 * The demo page.
 *
 * See docs/roadmap/semantic-tokens.md. That the page reaches for no primitive
 * is checked at the source, in packages/ui — this covers that it renders from
 * the layer and answers to both modes.
 */

test.describe("The system preview", () => {
  test("draws itself from the seeded semantic layer", async ({ page }) => {
    await openPreview(page);

    await expect(
      page.getByRole("heading", { name: "A system you can hand over" }),
    ).toBeVisible();
    /* Nineteen, because a workspace migrated from the old keys is seeded with
       the roles that were already in use. */
    await expect(page.getByText("Drawn from 19 semantic tokens")).toBeVisible();
  });

  test("answers to the mode toggle", async ({ page }) => {
    await openPreview(page);

    const page_ = page.getByRole("heading", {
      name: "A system you can hand over",
    });
    await expect(page_).toBeVisible();

    /* A token-driven element rather than a wrapper: the first div on the page
       belongs to the framework and is transparent either way.

       The baseline is only meaningful once the layer has landed, which is what
       openPreview waits for. Waiting on the heading above is not enough: it
       renders before the read, from an empty token list. */
    const background = () =>
      page
        .getByRole("button", { name: "Primary action" })
        .evaluate((node) => getComputedStyle(node).backgroundColor);
    const light = await background();

    await page
      .getByRole("radiogroup", { name: "Colour mode" })
      .getByRole("radio", { name: "Dark" })
      .click();
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

test.describe("The preview's vision control", () => {
  test("turns simulation on and back off again", async ({ page }) => {
    /* A selector alone had no way back: it offered the four deficiencies and
       nothing that meant normal vision. The chip is the on/off, the same shape
       the shade generator uses. */
    await openPreview(page);

    const primary = page.getByRole("button", { name: "Primary action" });
    const fill = () =>
      primary.evaluate((node) => getComputedStyle(node).backgroundColor);
    /* Taken after openPreview, so this is the colour the token really gives
       rather than the transparent one the button has before its variables
       arrive. Turning the simulation off comes back to the former and never
       to the latter, so a baseline read too early fails the second half of
       this test while the first half passes. */
    const normal = await fill();

    const chip = page.getByRole("button", { name: "Vision" });
    await chip.click();
    await expect(page.getByLabel("Vision type")).toBeVisible();
    await expect.poll(fill).not.toBe(normal);

    await chip.click();
    await expect(page.getByLabel("Vision type")).toBeHidden();
    await expect.poll(fill).toBe(normal);
  });

  test("shares the choice with the shade generator", async ({ page }) => {
    /* One preference for the workspace: both pages read the same provider, so
       turning it on here has it on there. */
    await openPreview(page);
    await page.getByRole("button", { name: "Vision" }).click();
    await expect(page.getByLabel("Vision type")).toBeVisible();

    await page.goto("/");
    await expect(page.getByRole("button", { name: "Vision" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
