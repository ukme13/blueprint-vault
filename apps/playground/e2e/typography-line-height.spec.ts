import { expect, test } from "./typography-fixtures";

/**
 * The line-height field.
 *
 * The engine is covered in `packages/ui`. What only a browser can answer is
 * whether the field commits at all: it holds a draft and writes it on blur,
 * and Astryx's NumberInput takes `onBlur` through `BaseProps` rather than
 * declaring one. That is a chain of assumptions, and reasoning about it is
 * not the same as watching it work.
 *
 * See docs/roadmap/typography-system-rework.md.
 */

const LINE_HEIGHT = "body line height";
const SIZE = "body size";

test.describe("The line-height field", () => {
  test("shows the ratio a migrated project stored", async ({
    seededPage: page,
  }) => {
    /* Seeded at 1.5, and a stored bare number meant a ratio. Reverting to
       `auto` here would be the migration silently dropping what someone set. */
    await expect(page.getByLabel(LINE_HEIGHT)).toHaveValue("1.5");
  });

  test("reads a bare number by its size, with no unit control to find", async ({
    seededPage: page,
  }) => {
    const field = page.getByLabel(LINE_HEIGHT);

    /* 28 is not a ratio anybody means — it is a pixel height typed without
       its unit, and the two ranges cannot overlap. */
    await field.fill("28");
    await field.blur();
    await expect(field).toHaveValue("28");

    await field.fill("1.25");
    await field.blur();
    await expect(field).toHaveValue("1.25");
  });

  test("hands the value back to the group default on the auto key", async ({
    seededPage: page,
  }) => {
    const field = page.getByLabel(LINE_HEIGHT);
    await field.focus();
    await field.press("a");

    /* Body is 16px and body's auto ratio is 1.5, so 24 exactly. The field
       shows the pixel height rather than the word: "auto" says how the value
       was chosen, not what it is. */
    await expect(field).toHaveValue("24");
  });

  test("auto follows the font size, and a pinned height does not", async ({
    seededPage: page,
  }) => {
    const field = page.getByLabel(LINE_HEIGHT);
    const size = page.getByLabel(SIZE);

    await field.focus();
    await field.press("a");
    await expect(field).toHaveValue("24");

    /* 18 x 1.5 is 27, which is on no grid, so auto snaps up to 28. This is
       the whole point of storing no number: the value tracks the size, and
       lands on the 4px rhythm on the way. */
    await size.fill("18");
    await size.blur();
    await expect(size).toHaveValue("18");
    await expect(field).toHaveValue("28");

    /* Pinning is how somebody opts out of that, and Enter is how they say so.
       The number is already on screen, so there is nothing to type: only an
       explicit commit can tell "I want this one" from "I clicked away". */
    await field.focus();
    await field.press("Enter");
    await size.fill("20");
    await size.blur();
    await expect(size).toHaveValue("20");
    /* 20 x 1.5 snaps to 32, so a value still on auto would move here. */
    await expect(field).toHaveValue("28");
  });
});
