import { expect, test } from "./typography-fixtures";

/**
 * The line-height field, which takes all three ways of saying it.
 *
 * The engine is covered in `packages/ui`. What only a browser can answer is
 * whether the field commits at all: it holds a draft and writes it on blur,
 * and Astryx's TextInput has no `onBlur` of its own — the prop reaches the
 * DOM through `BaseProps`, which extends `React.HTMLAttributes`. That is a
 * chain of three assumptions, and reasoning about it is not the same as
 * watching it work.
 *
 * See docs/roadmap/typography-system-rework.md.
 */

/* The seed is a legacy project whose roles carry a bare number, so every
   value here has been through the migration on the way in. */
const BODY_LINE_HEIGHT = "body line height";

test.describe("The line-height field", () => {
  test("shows the ratio a migrated project stored", async ({
    seededPage: page,
  }) => {
    /* Seeded at 1.5, and a stored number meant a ratio. Reverting to `auto`
       here would be the migration silently dropping what someone set. */
    await expect(page.getByLabel(BODY_LINE_HEIGHT)).toHaveValue("1.5");
  });

  test("takes a pixel height and reports the ratio it works out to", async ({
    seededPage: page,
  }) => {
    const field = page.getByLabel(BODY_LINE_HEIGHT);
    await field.fill("28px");
    await field.blur();

    await expect(field).toHaveValue("28px");
    /* Body is 16px, so 28 is a ratio of 1.75. Both numbers are on screen
       because either one alone makes the other look arbitrary. */
    await expect(page.getByText("28px · 1.75")).toBeVisible();
  });

  test("reads a bare number by its size, with no unit control to find", async ({
    seededPage: page,
  }) => {
    const field = page.getByLabel(BODY_LINE_HEIGHT);

    await field.fill("24");
    await field.blur();
    /* 24 is not a ratio anybody means — it is a pixel height typed without
       its unit, and the field says so by adding one. */
    await expect(field).toHaveValue("24px");

    await field.fill("1.25");
    await field.blur();
    await expect(field).toHaveValue("1.25");
  });

  test("snaps auto up onto the 4px grid", async ({ seededPage: page }) => {
    const field = page.getByLabel(BODY_LINE_HEIGHT);
    await field.fill("auto");
    await field.blur();

    /* Body is 16px and body's auto ratio is 1.5, which is 24 exactly. The
       grid claim is proven in the unit tests across every size; this is the
       claim that `auto` reaches the field at all. */
    await expect(field).toHaveValue("auto");
    await expect(page.getByText("auto · 24px · 1.5")).toBeVisible();
  });

  test("keeps the last good value when it cannot read what was typed", async ({
    seededPage: page,
  }) => {
    const field = page.getByLabel(BODY_LINE_HEIGHT);

    /* Commit something first. Asserting against the seed instead would pass
       just as well if the field never committed anything at all, which is
       the failure this test is most likely to be hiding. */
    await field.fill("28px");
    await field.blur();
    await expect(page.getByText("28px · 1.75")).toBeVisible();

    await field.fill("0.5");
    await field.blur();

    /* Neither a ratio nor a plausible pixel height. Storing a guess would
       render a broken page and look like our bug, so the field refuses and
       the model keeps what it had. */
    await expect(page.getByText("28px · 1.75")).toBeVisible();
  });
});
