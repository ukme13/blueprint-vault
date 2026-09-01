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

/*
 * By role, not by label.
 *
 * `hasClear` puts a button labelled "Clear body line height" beside the
 * input, and `getByLabel` matches on substring — so the label alone resolves
 * to two elements and fails strict mode. The role is what tells the field
 * from the button that empties it.
 */
const lineHeightField = (page: import("@playwright/test").Page) =>
  page.getByRole("spinbutton", { name: LINE_HEIGHT });
const sizeField = (page: import("@playwright/test").Page) =>
  page.getByRole("spinbutton", { name: SIZE });

test.describe("The line-height field", () => {
  test("shows the ratio a migrated project stored", async ({
    seededPage: page,
  }) => {
    /* Seeded at 1.5, and a stored bare number meant a ratio. Reverting to
       `auto` here would be the migration silently dropping what someone set. */
    await expect(lineHeightField(page)).toHaveValue("1.5");
  });

  test("reads a bare number by its size, with no unit control to find", async ({
    seededPage: page,
  }) => {
    const field = lineHeightField(page);

    /* 28 is not a ratio anybody means — it is a pixel height typed without
       its unit, and the two ranges cannot overlap. */
    await field.fill("28");
    await field.blur();
    await expect(field).toHaveValue("28");

    await field.fill("1.25");
    await field.blur();
    await expect(field).toHaveValue("1.25");
  });

  test("shows auto as an empty field over the height it resolved to", async ({
    seededPage: page,
  }) => {
    const field = lineHeightField(page);
    await field.focus();
    await field.press("a");

    /* Empty, not "auto" and not a real 24. The word says how the value was
       chosen and never what it is; a real 24 would be indistinguishable from
       a pinned one. Body is 16px at a 1.5 default, so 24 exactly. */
    await expect(field).toHaveValue("");
    await expect(field).toHaveAttribute("placeholder", "24");
  });

  test("returns to auto when the field is cleared", async ({
    seededPage: page,
  }) => {
    const field = lineHeightField(page);
    const size = sizeField(page);

    /* The clear button, which is the gesture the placeholder invites. It
       commits on blur like any other edit, so the model does not change until
       focus leaves — `fill("")` looks the same on screen and never gets
       there, because it does not emit the events the input listens for. */
    await page.getByRole("button", { name: `Clear ${LINE_HEIGHT}` }).click();
    await size.click();
    await expect(field).toHaveValue("");

    /* Cleared really means auto, rather than an empty field still holding the
       old number underneath: only auto follows the size. 18 x 1.5 is 27, and
       auto snaps up to 28 — a pinned 1.5 would sit at 27. */
    await size.fill("18");
    await size.blur();
    await expect(field).toHaveAttribute("placeholder", "28");
  });

  test("auto follows the font size, and a pinned height does not", async ({
    seededPage: page,
  }) => {
    const field = lineHeightField(page);
    const size = sizeField(page);

    await field.focus();
    await field.press("a");
    await expect(field).toHaveAttribute("placeholder", "24");

    /* 18 x 1.5 is 27, which is on no grid, so auto snaps up to 28. This is
       the point of storing no number: the value tracks the size and lands on
       the 4px rhythm on the way. */
    await size.fill("18");
    await size.blur();
    await expect(field).toHaveAttribute("placeholder", "28");

    /* Pinning is how somebody opts out of that. Against an empty field the
       number is an ordinary edit, which is what the placeholder buys. */
    await field.fill("28");
    await field.blur();
    await expect(field).toHaveValue("28");

    await size.fill("20");
    await size.blur();
    /* 20 x 1.5 snaps to 32, so a value still on auto would move here. */
    await expect(field).toHaveValue("28");
  });
});
