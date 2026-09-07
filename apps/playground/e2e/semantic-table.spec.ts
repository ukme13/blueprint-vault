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

test.describe("Reference transparency", () => {
  test("edits alpha with a checkerboard preview and restores it with undo", async ({
    seededPage: page,
  }) => {
    const editor = await openSemantics(page);
    await showBorders(editor);
    const row = editor.locator('tr:has([data-semantic-token="border.subtle"])');
    const alpha = row.getByRole("textbox", {
      name: /border subtle light transparency/i,
    });

    await expect(alpha).toHaveValue("12%");
    await expect(
      row
        .getByRole("button", { name: /edit border subtle light reference/i })
        .locator("[data-transparent]"),
    ).toBeVisible();
    await alpha.fill("65%");
    await alpha.press("Enter");
    await expect(alpha).toHaveValue("65%");

    await page.keyboard.press("ControlOrMeta+z");
    await expect(alpha).toHaveValue("12%");
  });

  test("keeps alpha docked, exposes opaque values on focus, and tabs from reference", async ({
    seededPage: page,
  }) => {
    const editor = await openSemantics(page);
    await showBorders(editor);
    const row = editor.locator(
      'tr:has([data-semantic-token="border.default"])',
    );
    const reference = row.getByRole("button", {
      name: /edit border default light reference/i,
    });
    const alpha = row.getByRole("textbox", {
      name: /border default light transparency/i,
    });
    const alphaField = row.locator('[data-semantic-cell="light-alpha"]');

    await expect(alpha).toHaveValue("100%");
    await expect(alphaField).toHaveCSS("opacity", "0");
    const before = await reference.boundingBox();
    await alpha.focus();
    await expect(alphaField).toHaveCSS("opacity", "1");
    expect(await reference.boundingBox()).toEqual(before);

    await reference.focus();
    await page.keyboard.press("Tab");
    await expect(alpha).toBeFocused();
  });
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

  test("Move to group > New group moves the rows and the counts follow", async ({
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
    await page.getByRole("menuitem", { name: "Move to group…" }).hover();
    await page.getByRole("menuitem", { name: "New group" }).click();
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

  test("Move to group lists existing folders", async ({ seededPage: page }) => {
    const editor = await openSemantics(page);
    await showBorders(editor);

    await rowBody(editor, "border.subtle").click();
    await editor
      .getByRole("button", { name: "Actions for Border subtle" })
      .click();
    await editor.getByRole("menuitem", { name: "Move to group…" }).hover();
    await expect(page.getByRole("menuitem", { name: "Focus" })).toBeVisible();
    await page.getByRole("menuitem", { name: "Focus" }).click();

    await expect(editor.locator('[data-token="focus.subtle"]')).toHaveCount(0);
    await expect(groupEntry(editor, "Borders")).toContainText("3");
    await expect(groupEntry(editor, "Focus")).toContainText("2");
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
    await page.getByRole("menuitem", { name: "Move to group…" }).hover();
    await page.getByRole("menuitem", { name: "New group" }).click();
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

  test("the grip reorders rows inside one folder", async ({
    seededPage: page,
  }) => {
    const editor = await openSemantics(page);
    await showBorders(editor);

    const muted = editor.getByRole("button", { name: "Reorder Border muted" });
    const subtle = editor.getByRole("button", {
      name: "Reorder Border subtle",
    });
    const from = await muted.boundingBox();
    const to = await subtle.boundingBox();
    if (!from || !to) throw new Error("Expected row grips to be visible");
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, {
      steps: 12,
    });
    await page.mouse.up();

    await expect(await rowIds(editor)).toEqual([
      "border.default",
      "border.muted",
      "border.subtle",
      "border.strong",
    ]);
  });

  test("a new token keeps its hyphen and can be deleted", async ({
    seededPage: page,
  }) => {
    const editor = await openSemantics(page);

    await editor.getByRole("button", { name: "Add token" }).click();
    const name = editor.getByLabel("custom.new-token name");
    await expect(name).toBeFocused();
    await name.fill("pending");
    await name.press("Enter");

    await expect(editor.locator('[data-token="custom.pending"]')).toBeVisible();
    await editor.getByRole("button", { name: "Actions for pending" }).click();
    await page.getByRole("menuitem", { name: "Delete" }).click();
    await expect(editor.locator('[data-token="custom.pending"]')).toHaveCount(
      0,
    );
  });
});

test.describe("Folder names and spreadsheet editing", () => {
  test("shows the short name beside the full exported variable", async ({
    seededPage: page,
  }) => {
    const editor = await openSemantics(page);
    await showBorders(editor);

    const row = editor.locator('tr:has([data-token="border.subtle"])');
    await expect(
      row.getByRole("button", { name: "subtle", exact: true }),
    ).toHaveText("subtle");
    await expect(
      row.getByText("--color-border-subtle", { exact: true }),
    ).toBeVisible();
  });

  test("renaming a short name keeps the current folder", async ({
    seededPage: page,
  }) => {
    const editor = await openSemantics(page);
    await showBorders(editor);

    await editor
      .locator('tr:has([data-token="border.subtle"])')
      .getByRole("button", { name: "subtle", exact: true })
      .dblclick();
    const field = editor.getByLabel("border.subtle name");
    await field.fill("brand");
    await field.press("Enter");

    await expect(editor.locator('[data-token="border.brand"]')).toBeVisible();
    await expect(
      editor.getByText("--color-border-brand", { exact: true }),
    ).toBeVisible();
  });

  test("New token follows the active folder and opens its name", async ({
    seededPage: page,
  }) => {
    const editor = await openSemantics(page);
    await groupEntry(editor, "Status").click();
    await editor.getByRole("button", { name: "Add token" }).click();

    const field = editor.getByLabel("status.new-token name");
    await expect(field).toBeFocused();
    await field.fill("pending");
    await field.press("Enter");

    await expect(editor.locator('[data-token="status.pending"]')).toBeVisible();
  });

  test("a dotted name in All creates a token in that folder", async ({
    seededPage: page,
  }) => {
    const editor = await openSemantics(page);
    await editor
      .getByRole("navigation", { name: "Token groups" })
      .getByRole("listitem")
      .filter({ hasText: "All" })
      .click();
    await editor.getByRole("button", { name: "Add token" }).click();

    const field = editor.getByLabel("custom.new-token name");
    await field.fill("primary.x");
    await field.press("Enter");

    const heading = editor.locator('[data-group-heading="primary"]');
    await expect(heading).toBeVisible();
    await expect(editor.locator('[data-token="primary.x"]')).toBeVisible();
  });

  test("Enter moves editing down and Tab moves it right", async ({
    seededPage: page,
  }) => {
    const editor = await openSemantics(page);
    await showBorders(editor);

    const description = editor.getByLabel("border.subtle description");
    await editor
      .locator('tr:has([data-token="border.subtle"])')
      .locator('[data-semantic-cell="description"]')
      .dblclick();
    await expect(description).toBeFocused();
    await description.fill("first");
    await description.press("Enter");
    await expect(editor.getByLabel("border.muted description")).toBeFocused();

    await editor
      .locator('tr:has([data-token="border.subtle"])')
      .locator('[data-semantic-cell="name"]')
      .dblclick();
    const name = editor.getByLabel("border.subtle name");
    await name.fill("subtle-renamed");
    await name.press("Tab");
    await expect(
      editor.getByLabel("border.subtle-renamed description"),
    ).toBeFocused();
  });

  test("Ctrl-Z after two renames undoes only the latest rename", async ({
    seededPage: page,
  }) => {
    const editor = await openSemantics(page);
    await showBorders(editor);

    await editor
      .locator('tr:has([data-token="border.subtle"])')
      .locator('[data-semantic-cell="name"]')
      .dblclick();
    let field = editor.getByLabel("border.subtle name");
    await field.fill("alpha");
    await field.press("Enter");

    field = editor.getByLabel("border.muted name");
    await field.fill("beta");
    await field.press("Enter");
    await page.keyboard.press("ControlOrMeta+z");

    await expect(editor.locator('[data-token="border.alpha"]')).toBeVisible();
    await expect(editor.locator('[data-token="border.muted"]')).toBeVisible();
    await expect(editor.locator('[data-token="border.beta"]')).toHaveCount(0);
  });

  test("All view keeps a sticky heading for each folder", async ({
    seededPage: page,
  }) => {
    const editor = await openSemantics(page);
    const heading = editor.locator("[data-group-heading]").first();
    await expect(heading).toBeVisible();
    await expect(heading.locator("td")).toHaveCSS("position", "sticky");
    await expect(heading.locator("td")).toHaveCSS("padding-top", "40px");
    await expect(heading.locator("td")).toHaveCSS("padding-bottom", "8px");
  });

  test("the colour chip opens the reference picker", async ({
    seededPage: page,
  }) => {
    const editor = await openSemantics(page);
    await showBorders(editor);
    await editor.getByLabel(/Edit Border subtle light reference/i).click();
    await expect(page.getByLabel("Border subtle light track")).toBeVisible();
    await expect(page.getByLabel("Border subtle light weight")).toBeVisible();
  });

  test("column separators can be resized with the keyboard", async ({
    seededPage: page,
  }) => {
    const editor = await openSemantics(page);
    const separator = editor.getByRole("separator", {
      name: "Resize name column",
    });
    const before = await separator.getAttribute("aria-valuenow");
    await separator.focus();
    await page.keyboard.press("ArrowRight");
    await expect(separator).not.toHaveAttribute("aria-valuenow", before ?? "");
  });
});
