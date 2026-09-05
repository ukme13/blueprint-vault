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
    /* Seventy-two, because a workspace migrated from the old keys is seeded
       with every role the layer has — including the six that came over from
       the studio's chrome and the three each status carries, all of which
       fillSeedRoles adds on read. */
    await expect(page.getByText("Drawn from 72 semantic tokens")).toBeVisible();
  });

  test("answers to the mode toggle", async ({ page }) => {
    await openPreview(page);

    const heading = page.getByRole("heading", {
      name: "A system you can hand over",
    });
    await expect(heading).toBeVisible();

    /* A token-driven element rather than a wrapper: the first div on the page
       belongs to the framework and is transparent either way.

       The baseline is only meaningful once the layer has landed, which is what
       openPreview waits for. Waiting on the heading above is not enough: it
       renders before the read, from an empty token list. */
    const background = () =>
      page
        .getByRole("button", { name: "Primary action" })
        .evaluate((node) => getComputedStyle(node).backgroundColor);
    const dark = await background();

    /* Light, because the studio opens dark and the canvas now follows the
       studio. Clicking the mode it is already in would assert nothing. */
    await page
      .getByRole("radiogroup", { name: "Theme" })
      .getByRole("radio", { name: "Light" })
      .click();
    await expect(page.getByText("in light mode")).toBeVisible();

    /* The same token, a different primitive. A layer that held one value per
       name could not do this at all. */
    await expect.poll(background).not.toBe(dark);
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

test.describe("The preview's theme control", () => {
  test("is the studio's own, and moves the chrome with the canvas", async ({
    page,
  }) => {
    await openPreview(page);
    /* One control, and the same one every other page carries. This page used
       to have a switch of its own: first beside the studio's, which gave a
       page with two things called a theme each flipping a different half of
       it, and then alone, which gave a page whose only switch had no way to
       say "system". */
    await expect(
      page.getByRole("radiogroup", { name: "Colour mode" }),
    ).toHaveCount(0);
    const control = page.getByRole("radiogroup", { name: "Theme" });
    await expect(control).toBeVisible();
    await expect(control.getByRole("radio", { name: "System" })).toBeVisible();

    const bar = page.getByRole("banner");
    const chrome = () =>
      bar.evaluate((el) => getComputedStyle(el).backgroundColor);
    const canvas = () =>
      page
        .getByRole("button", { name: "Primary action" })
        .evaluate((node) => getComputedStyle(node).backgroundColor);
    const [chromeDark, canvasDark] = [await chrome(), await canvas()];

    await control.getByRole("radio", { name: "Light" }).click();

    /* Both halves, because moving one is the bug this replaced: the canvas
       draws from semantic variables computed for the resolved mode, the bar
       from light-dark() chrome tokens, and they answer to one choice now. */
    await expect.poll(chrome).not.toBe(chromeDark);
    await expect.poll(canvas).not.toBe(canvasDark);
  });

  test("is the same choice the studio pages make", async ({
    seededPage: page,
  }) => {
    /* Chosen in the palette studio, read on the preview. The complaint this
       answers was exactly this crossing: picking dark left the preview light,
       because the preview's mode was a second piece of state. */
    await page
      .getByRole("radiogroup", { name: "Theme" })
      .getByRole("radio", { name: "Light" })
      .click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    await page.goto("/preview");
    await expect(page.getByText("in light mode")).toBeVisible();
    await expect(
      page
        .getByRole("radiogroup", { name: "Theme" })
        .getByRole("radio", { name: "Light" }),
    ).toBeChecked();
  });
});
