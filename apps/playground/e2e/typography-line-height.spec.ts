import {
  expect,
  fillHybridNumber,
  showInspectorPanel,
  test,
} from "./typography-fixtures";

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

/*
 * Body's line height as the workspace has it stored, not as the field shows it.
 *
 * The field shows its own draft, so it reads back correctly whether or not the
 * edit ever reached the model. A field that committed the edit before last
 * looked right in every assertion here until this read the other side of it.
 */
const storedLineHeight = (page: import("@playwright/test").Page) =>
  page.evaluate(() => {
    const raw = window.localStorage.getItem("blueprint.workspace.v1");
    if (!raw) return null;
    const roles = JSON.parse(raw).typography.system.roles as {
      id: string;
      lineHeight: { mode: string; value?: number };
      unlinkedLineHeights?: Record<string, { mode: string; value?: number }>;
    }[];
    const body = roles.find((role) => role.id === "body");
    if (!body) return null;
    return body.unlinkedLineHeights?.desktop ?? body.lineHeight;
  });

const storedSharedLineHeight = (page: import("@playwright/test").Page) =>
  page.evaluate(() => {
    const raw = window.localStorage.getItem("blueprint.workspace.v1");
    if (!raw) return null;
    const roles = JSON.parse(raw).typography.system.roles as {
      id: string;
      lineHeight: { mode: string; value?: number };
    }[];
    return roles.find((role) => role.id === "body")?.lineHeight ?? null;
  });

const unlinkedMarker = (page: import("@playwright/test").Page) =>
  page.locator("[data-unlinked='true']").filter({
    has: lineHeightField(page),
  });

test.describe("The line-height field", () => {
  /* Every field here lives on a role row, and role rows are in the Groups
     panel. */
  test.beforeEach(async ({ seededPage: page }) => {
    await showInspectorPanel(page, "Groups");
  });

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
    await expect
      .poll(() => storedLineHeight(page))
      .toEqual({
        mode: "px",
        value: 28,
      });
    await expect
      .poll(() => storedSharedLineHeight(page))
      .toEqual({
        mode: "ratio",
        value: 1.5,
      });
    await expect(unlinkedMarker(page)).toBeVisible();

    await field.fill("1.25");
    await field.blur();
    await expect(field).toHaveValue("1.25");
    await expect
      .poll(() => storedLineHeight(page))
      .toEqual({
        mode: "ratio",
        value: 1.25,
      });
  });

  test("writes the edit that was just made, not the one before it", async ({
    seededPage: page,
  }) => {
    const field = lineHeightField(page);

    /* Reading the model after every edit, because the field cannot answer
       this. It shows its own draft, so it read back correctly even while the
       commit was writing the edit before it — the number on screen was right
       every time and the stored one was one blur behind.

       Whether that misses is a matter of timing on the pinned NumberInput,
       which delivers the last keystroke and the blur as separate events. It
       is what a version delivering both in one event would fail on. */
    for (const [typed, stored] of [
      ["28", 28],
      ["32", 32],
      ["36", 36],
    ] as const) {
      await field.fill(typed);
      await field.blur();
      await expect
        .poll(() => storedLineHeight(page))
        .toEqual({
          mode: "px",
          value: stored,
        });
    }
  });

  test("selects the text when select-all is pressed, rather than emptying", async ({
    seededPage: page,
  }) => {
    const field = lineHeightField(page);

    /* `a` on its own hands the height back to auto. Cmd+A and Ctrl+A carry
       the same key, so the shortcut swallowed select-all and cleared the
       field — in the one gesture somebody makes to replace what is in it. */
    await field.click();
    await page.keyboard.press("ControlOrMeta+a");

    await expect(field).toHaveValue("1.5");
    await expect
      .poll(() => storedLineHeight(page))
      .toEqual({
        mode: "ratio",
        value: 1.5,
      });
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

  test("returns to auto when a shared value is cleared", async ({
    seededPage: page,
  }) => {
    const field = lineHeightField(page);

    /* The clear button, which is the gesture the placeholder invites. It
       commits on blur like any other edit, so the model does not change until
       focus leaves — `fill("")` looks the same on screen and never gets
       there, because it does not emit the events the input listens for. */
    await page.getByRole("button", { name: `Clear ${LINE_HEIGHT}` }).click();
    await page.getByLabel("body font weight").click();
    await expect(field).toHaveValue("");

    /* Cleared really means auto, rather than an empty field still holding the
       old number underneath: only auto follows the size. 18 x 1.5 is 27, and
       auto snaps up to 28 — a pinned 1.5 would sit at 27. */
    await fillHybridNumber(page, SIZE, "18");
    await expect(field).toHaveAttribute("placeholder", "28");
  });

  test("returns to auto the moment a shared value is cleared, without waiting for a blur", async ({
    seededPage: page,
  }) => {
    const field = lineHeightField(page);

    await page.getByRole("button", { name: `Clear ${LINE_HEIGHT}` }).click();

    /* Still focused: clearing is an answer, not a step towards one.

       The placeholder is the tell, because it is computed from the model. 24
       is what `auto` gives body at 16px. */
    await expect(field).toHaveValue("");
    await expect(field).toHaveAttribute("placeholder", "24");
    await expect(field).toBeFocused();
  });

  test("auto follows the font size, and a pinned height does not", async ({
    seededPage: page,
  }) => {
    const field = lineHeightField(page);

    await field.focus();
    await field.press("a");
    await expect(field).toHaveAttribute("placeholder", "24");

    /* 18 x 1.5 is 27, which is on no grid, so auto snaps up to 28. This is
       the point of storing no number: the value tracks the size and lands on
       the 4px rhythm on the way. */
    await fillHybridNumber(page, SIZE, "18");
    await expect(field).toHaveAttribute("placeholder", "28");

    /* Pinning is how somebody opts out of that. Against an empty field the
       number is an ordinary edit, which is what the placeholder buys. */
    await field.fill("28");
    await field.blur();
    await expect(field).toHaveValue("28");

    await fillHybridNumber(page, SIZE, "20");
    /* 20 x 1.5 snaps to 32, so a value still on auto would move here. */
    await expect(field).toHaveValue("28");
  });

  test("typing a line height on phone leaves desktop on the shared value", async ({
    seededPage: page,
  }) => {
    const field = lineHeightField(page);
    const devices = page.getByRole("navigation", { name: "Preview devices" });

    await devices.getByRole("button", { name: "Phone" }).click();
    await field.fill("28");
    await field.blur();
    await expect(field).toHaveValue("28");
    await expect(unlinkedMarker(page)).toBeVisible();

    await devices.getByRole("button", { name: "Desktop", exact: true }).click();
    await expect(field).toHaveValue("1.5");
    await expect(unlinkedMarker(page)).toHaveCount(0);
    await expect
      .poll(() => storedSharedLineHeight(page))
      .toEqual({
        mode: "ratio",
        value: 1.5,
      });
  });

  test("clearing an override restores the shared line height", async ({
    seededPage: page,
  }) => {
    const field = lineHeightField(page);

    await field.fill("28");
    await field.blur();
    await expect(unlinkedMarker(page)).toBeVisible();

    await page.getByRole("button", { name: `Clear ${LINE_HEIGHT}` }).click();
    await expect(field).toHaveValue("1.5");
    await expect(unlinkedMarker(page)).toHaveCount(0);
    await expect
      .poll(() => storedSharedLineHeight(page))
      .toEqual({
        mode: "ratio",
        value: 1.5,
      });
    await expect
      .poll(() => storedLineHeight(page))
      .toEqual({
        mode: "ratio",
        value: 1.5,
      });
  });
});
