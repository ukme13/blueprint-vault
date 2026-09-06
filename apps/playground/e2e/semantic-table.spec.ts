import { expect, test } from "./fixtures";
import type { Locator, Page } from "@playwright/test";

/**
 * The Semantics tab as a spreadsheet.
 *
 * Stage 4a of docs/roadmap/semantic-table-editor.md. Selecting, deleting,
 * duplicating and grouping in bulk — the parts a unit test cannot reach,
 * because every one of them is a modifier key, a menu and a toast rather than
 * a function call. The functions themselves are tested in `packages/ui`.
 *
 * The `border` group is where the mixed cases are built. Of its four seeded
 * roles, `border.subtle` and `border.muted` are the only two in the whole seed
 * set that nothing reads by name, so a range across the group is two rows that
 * can be deleted and two that cannot.
 */

async function openSemantics(page: Page): Promise<Locator> {
  await page.getByRole("button", { name: "Semantics" }).click();
  const editor = page.getByRole("region", { name: "Semantic tokens" });
  /* Longer than the default, because four workers against one webpack dev
     server is genuinely slow to compile this route on first hit — the tab
     click lands and the panel takes its time. Seen failing here once at the
     5s default while every assertion after it was fine. */
  await expect(editor).toBeVisible({ timeout: 20_000 });
  return editor;
}

/** The sidebar entry for a group, by its label. */
function groupEntry(editor: Locator, label: string): Locator {
  return editor
    .getByRole("navigation", { name: "Token groups" })
    .getByRole("listitem")
    .filter({ hasText: label });
}

/** Show one group, so the row order under test is short and known. */
async function showBorders(editor: Locator): Promise<void> {
  await groupEntry(editor, "Borders").click();
  await expect(editor.locator("tr:has([data-token])")).toHaveCount(4);
}

/**
 * A row's own click target: the variable cell, which holds no control.
 *
 * One CSS selector rather than `locator("tr", { has: … })`. The option form
 * takes a locator relative to the row, and a locator built from `editor` is
 * rooted at the region instead — which matches nothing and times out looking
 * for it.
 */
function rowBody(editor: Locator, id: string): Locator {
  return editor.locator(`tr:has([data-token="${id}"]) code`);
}

const selectionCount = (editor: Locator) =>
  editor.locator("[data-selection-count]");

/**
 * The toast, not its live-region twin.
 *
 * Astryx announces a toast twice: once in the visible stack and once in an
 * `aria-live` region, which is right for a screen reader and a strict-mode
 * violation for a plain `getByText`.
 */
const toastText = (page: Page) => page.getByLabel("Notifications");

const rowIds = (editor: Locator) =>
  editor
    .locator("[data-token]")
    .evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("data-token")),
    );

test.describe("Selecting rows", () => {
  test("shift-click takes the block, and the count says how many", async ({
    seededPage: page,
  }) => {
    const editor = await openSemantics(page);
    await showBorders(editor);

    await rowBody(editor, "border.default").click();
    await expect(selectionCount(editor)).toHaveText("1 selected");

    await rowBody(editor, "border.muted").click({ modifiers: ["Shift"] });
    await expect(selectionCount(editor)).toHaveText("3 selected");
    /* Selected in the markup, not only in the paint: a wash somebody cannot
       query is a wash a screen reader does not announce. */
    await expect(
      editor.locator("tr[aria-selected='true']:has([data-token])"),
    ).toHaveCount(3);
  });

  test("ctrl-click adds a row and takes it out again", async ({
    seededPage: page,
  }) => {
    const editor = await openSemantics(page);
    await showBorders(editor);

    await rowBody(editor, "border.default").click();
    await rowBody(editor, "border.strong").click({
      modifiers: ["ControlOrMeta"],
    });
    await expect(selectionCount(editor)).toHaveText("2 selected");

    await rowBody(editor, "border.strong").click({
      modifiers: ["ControlOrMeta"],
    });
    await expect(selectionCount(editor)).toHaveText("1 selected");
  });

  test("changing the group clears the selection", async ({
    seededPage: page,
  }) => {
    /* The rule an operation's safety rests on: it can never touch a row
       somebody cannot see.
       Two mechanisms hold this up and only one of them is visible here. A row
       belongs to exactly one group, so the selection could not have survived
       the filter anyway — `selectionWithin` drops it at render. The explicit
       clear is what the test below distinguishes. */
    const editor = await openSemantics(page);
    await showBorders(editor);

    await rowBody(editor, "border.default").click();
    await rowBody(editor, "border.muted").click({ modifiers: ["Shift"] });
    await expect(selectionCount(editor)).toHaveText("3 selected");

    await groupEntry(editor, "Surfaces").click();
    await expect(selectionCount(editor)).not.toContainText("selected");
  });

  test("searching clears it even when the row is still on screen", async ({
    seededPage: page,
  }) => {
    /* The case that tells the two mechanisms apart, and the reason it is
       written this way: searching for the selected row's own name leaves it
       visible, so narrowing-at-render keeps it selected and only the explicit
       clear empties the selection. Written first against a row the search hid,
       where both mechanisms pass and neither is being tested. */
    const editor = await openSemantics(page);
    await showBorders(editor);
    await rowBody(editor, "border.subtle").click();
    await expect(selectionCount(editor)).toHaveText("1 selected");

    await editor.getByLabel("Search tokens").fill("subtle");

    /* Still there — and no longer selected. */
    await expect(editor.locator("tr:has([data-token])")).toHaveCount(1);
    await expect(editor.locator('[data-token="border.subtle"]')).toBeVisible();
    await expect(selectionCount(editor)).not.toContainText("selected");
  });

  /* There is deliberately no test here for "search matches a name as well as
     an id". It cannot be written against this studio: every seeded name is its
     id in prose — `surface.base` is "Surface base" — and a rename re-slugs the
     id from the label, so the two can never disagree by any route somebody can
     take through the interface. The distinction is real in the model, where a
     file may hold any name, and it is tested there against a hand-built layer
     in `semantic-selection.test.ts`. A version of it here would have had to
     write a workspace into storage to create a state the studio cannot, which
     is a test of the fixture. */
});

test.describe("Operating on a selection", () => {
  test("Delete removes the free rows, keeps the read ones, and says which", async ({
    seededPage: page,
  }) => {
    const editor = await openSemantics(page);
    await showBorders(editor);

    /* All four: two nothing reads, two the Astryx bridge does. */
    await rowBody(editor, "border.default").click();
    await rowBody(editor, "border.strong").click({ modifiers: ["Shift"] });
    await expect(selectionCount(editor)).toHaveText("4 selected");

    /* The two that are read carry the mark; the two that are not do not. */
    await expect(editor.locator("[data-locked]")).toHaveCount(2);

    await page.keyboard.press("Delete");

    await expect(await rowIds(editor)).toEqual([
      "border.default",
      "border.strong",
    ]);
    /* And the refusal is said out loud, naming a row and what reads it —
       otherwise two rows simply fail to disappear. */
    await expect(toastText(page)).toContainText(
      "border.default (Astryx bridge)",
    );
  });

  test("Ctrl-Z after a delete puts the rows back where they were", async ({
    seededPage: page,
  }) => {
    /* Order as well as content. A history that re-added the tokens rather than
       restoring the layer would put them at the end, and a table somebody
       arranged would come back rearranged. */
    const editor = await openSemantics(page);
    await showBorders(editor);
    const before = await rowIds(editor);

    await rowBody(editor, "border.subtle").click();
    await rowBody(editor, "border.muted").click({ modifiers: ["Shift"] });
    await page.keyboard.press("Delete");
    await expect(editor.locator("tr:has([data-token])")).toHaveCount(2);

    await page.keyboard.press("ControlOrMeta+z");

    await expect.poll(() => rowIds(editor)).toEqual(before);
  });

  test("Duplicate puts the copy directly under its source", async ({
    seededPage: page,
  }) => {
    const editor = await openSemantics(page);
    await showBorders(editor);

    await editor
      .getByRole("button", { name: "Actions for Border subtle" })
      .click();
    await page.getByRole("menuitem", { name: "Duplicate" }).click();

    await expect
      .poll(() => rowIds(editor))
      .toEqual([
        "border.default",
        "border.subtle",
        "border.subtle-copy",
        "border.muted",
        "border.strong",
      ]);
  });

  test("New group with selection moves the rows and the counts follow", async ({
    seededPage: page,
  }) => {
    const editor = await openSemantics(page);
    await showBorders(editor);
    await expect(groupEntry(editor, "Borders")).toContainText("4");

    await rowBody(editor, "border.subtle").click();
    await rowBody(editor, "border.muted").click({ modifiers: ["Shift"] });

    await editor
      .getByRole("button", { name: "Actions for Border subtle" })
      .click();
    await page
      .getByRole("menuitem", { name: "New group with selection" })
      .click();
    /* Wait for the focus the field asks for before typing into it. The field
       cancels on blur, and the menu returns focus to its trigger as it closes
       — so a fill that lands before the field has focus is a fill the menu
       then throws away. Passed alone and failed once in a full parallel run
       before this line. */
    const name = editor.getByLabel("New group name");
    await expect(name).toBeFocused();
    await name.fill("rule");
    await name.press("Enter");

    await expect(groupEntry(editor, "Borders")).toContainText("2");
    await expect(groupEntry(editor, "rule")).toContainText("2");
  });

  test("a row something reads refuses the move, and says so", async ({
    seededPage: page,
  }) => {
    /* The id is the exported name, so moving `border.default` to another group
       is deleting it as far as the bridge is concerned. */
    const editor = await openSemantics(page);
    await showBorders(editor);

    await rowBody(editor, "border.default").click();
    await editor
      .getByRole("button", { name: "Actions for Border default" })
      .click();
    await page
      .getByRole("menuitem", { name: "New group with selection" })
      .click();
    /* Wait for the focus the field asks for before typing into it. The field
       cancels on blur, and the menu returns focus to its trigger as it closes
       — so a fill that lands before the field has focus is a fill the menu
       then throws away. Passed alone and failed once in a full parallel run
       before this line. */
    const name = editor.getByLabel("New group name");
    await expect(name).toBeFocused();
    await name.fill("rule");
    await name.press("Enter");

    await expect(toastText(page)).toContainText(
      "border.default (Astryx bridge)",
    );
    await expect(groupEntry(editor, "Borders")).toContainText("4");
  });
});
