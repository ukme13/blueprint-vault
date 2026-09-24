import type { Locator } from "@playwright/test";
import { expect, test } from "./fixtures";

/**
 * A button is the height of the field it sits beside.
 *
 * Found by measuring every field and every button on the same row within
 * 24px of it, across the studio. These three were off; everything else
 * already matched.
 */

async function height(locator: Locator): Promise<number> {
  const box = await locator.boundingBox();
  if (!box) throw new Error("not rendered");
  return Math.round(box.height);
}

/** The visible box of an Astryx field: its bordered wrapper, not the input. */
function fieldBox(input: Locator): Locator {
  return input.locator(
    "xpath=ancestor-or-self::*[contains(@class,'astryx-field') or contains(@class,'astryx-number-input') or contains(@class,'astryx-text-input')][last()]",
  );
}

test("the shade-count steppers match the count field", async ({
  seededPage: page,
}) => {
  /* Were 28px beside a 32px field. */
  const field = page.getByLabel("Shade count", { exact: true });
  const fieldHeight = await height(fieldBox(field).first());
  expect(fieldHeight).toBe(32);
  for (const name of ["Remove one shade", "Add one shade"]) {
    expect(await height(page.getByRole("button", { name })), name).toBe(
      fieldHeight,
    );
  }
});

test("a track's name field matches its details button", async ({
  seededPage: page,
}) => {
  /* Were 26px beside 28px; the gap showed when the field was hovered. */
  const name = page.getByRole("textbox", { name: "Rename primary colour" });
  const open = page.getByRole("button", {
    name: "Open primary colour details",
  });
  expect(await height(name)).toBe(await height(open));
});

test("a Uses row's menu matches the fields in its row", async ({
  seededPage: page,
}) => {
  /* Was 28px beside 32px value fields. */
  await page.goto("/spacing");
  await page.getByRole("button", { name: "Uses", exact: true }).click();
  const menu = page.getByRole("button", { name: /^Actions for / }).first();
  await expect(menu).toBeVisible();
  /* The field's visible box: the first bordered ancestor of its input. */
  const fieldHeight = await menu
    .locator("xpath=ancestor::tr[1]")
    .evaluate((row) => {
      /* The value field in the cell beside the menu: the row's last input. */
      const inputs = row.querySelectorAll("input");
      let node: HTMLElement | null = inputs[inputs.length - 1] ?? null;
      while (node && node !== row) {
        if (parseFloat(getComputedStyle(node).borderTopWidth) > 0) break;
        node = node.parentElement;
      }
      return Math.round(node!.getBoundingClientRect().height);
    });
  expect(fieldHeight).toBe(32);
  expect(await height(menu)).toBe(fieldHeight);
});

test("the Semantics Add control and Sync match the search field", async ({
  seededPage: page,
}) => {
  /* The combined Add control came from a branch written before buttons took
     the input heights, at 28px beside a 32px search. */
  await page.getByRole("button", { name: "Semantics" }).click();
  const editor = page.getByRole("region", { name: "Semantic tokens" });
  const search = fieldBox(editor.getByLabel("Search tokens")).first();
  const searchHeight = await height(search);
  expect(searchHeight).toBe(32);
  expect(await height(editor.getByRole("group", { name: "Add" }))).toBe(
    searchHeight,
  );
  expect(
    await height(editor.getByRole("button", { name: "Sync", exact: true })),
  ).toBe(searchHeight);
});
