import {
  DEFAULT_SPECIMEN_TEXT,
  expect,
  fillHybridNumber,
  showInspectorPanel,
  test,
} from "./typography-fixtures";
import {
  createWorkspaceFromHome,
  openWorkspaceSettings,
  readStoredWorkspace,
  writeStoredWorkspace,
} from "./fixtures";
import type { Locator } from "@playwright/test";

/**
 * Open a slot's picker from its chip, when it is not open already.
 *
 * A stack is a row of chips; each opens its slot's picker in a popover.
 */
async function openSlot(scope: Locator, label: string) {
  const input = scope.getByLabel(label, { exact: true });
  if ((await input.count()) === 0) {
    /* With a retry: a click that lands while the last popover is still
       closing is dropped while Astryx waits for the browser's asynchronous
       toggle event. No hand is that fast; a chip that never opens still
       fails. */
    await expect(async () => {
      if ((await input.count()) === 0) {
        await scope
          .getByRole("button", { name: new RegExp(`^${label}: `) })
          .click();
      }
      await expect(input).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 5000 });
  }
  return input;
}

async function searchFont(scope: Locator, label: string, query: string) {
  /* The picker's search field, which takes focus as the chip opens it. */
  const input = await openSlot(scope, label);
  await input.fill(query);
  return input;
}

/**
 * Open the bilingual fallback field.
 *
 * It is behind a button until it is wanted — three controls a Latin-only
 * stack never touches. A test that reaches straight for the picker is
 * reaching for something nobody has asked to see yet.
 */
async function openFallback(scope: Locator) {
  const add = scope.getByRole("button", { name: /^Add a fallback to / });
  if ((await add.count()) > 0) await add.first().click();
}

/**
 * The info icon at the end of a field's label.
 *
 * Astryx renders it as a bare `<svg>` inside the label with `display:
 * contents`, so there is no role and no accessible name to ask for — and no
 * tab stop either, which is why only facts are kept here and never an
 * instruction. `hasText` is anchored because "Base font" is also the start of
 * "Base font size".
 */
/** The stack as the workspace stored it, not as the fields show it. */
const storedFamilies = async (page: import("@playwright/test").Page) => {
  const stored = await readStoredWorkspace(page);
  return stored.typography.system.fonts[0].families as string[];
};

test.describe("Typography scale editing", () => {
  test("switches between Editor, Specimen and Preview without leaving the inspector", async ({
    seededPage: page,
  }) => {
    const views = page.getByRole("navigation", { name: "Typography views" });
    const settings = page.getByRole("region", { name: "Type scale settings" });

    await expect(views.getByRole("button", { name: "Editor" })).toBeVisible();
    await expect(views.getByRole("button", { name: "Specimen" })).toBeVisible();
    await expect(
      views.getByRole("button", { name: "Preview", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Playground sections" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("region", { name: "Generated type steps" }),
    ).toBeVisible();
    await expect(settings).toBeVisible();

    await views.getByRole("button", { name: "Specimen" }).click();
    const preview = page.getByRole("region", { name: "Type scale preview" });
    await expect(preview).toBeVisible();
    await expect(
      preview.getByRole("textbox", { name: "Specimen text" }).first(),
    ).toHaveValue(DEFAULT_SPECIMEN_TEXT);
    await expect(settings).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Generated type steps" }),
    ).toBeHidden();

    await views.getByRole("button", { name: "Preview", exact: true }).click();
    await expect(preview).toBeVisible();
    await expect(
      preview.getByRole("heading", {
        name: "A type scale is a set of decisions, not a set of sizes",
        level: 1,
      }),
    ).toBeVisible();
    await expect(preview.getByRole("heading", { name: "display" })).toHaveCount(
      0,
    );
    await expect(settings).toBeVisible();

    await views.getByRole("button", { name: "Editor" }).click();
    await expect(
      page.getByRole("region", { name: "Generated type steps" }),
    ).toBeVisible();
    await expect(settings).toBeVisible();
  });

  test("the preview follows a scale change made in the inspector", async ({
    seededPage: page,
  }) => {
    await page
      .getByRole("navigation", { name: "Typography views" })
      .getByRole("button", { name: "Specimen" })
      .click();

    const preview = page.getByRole("region", { name: "Type scale preview" });
    const sample = preview
      .getByRole("textbox", { name: "Specimen text" })
      .first();
    await expect(sample).toBeVisible();
    const before = await sample.evaluate((el) => getComputedStyle(el).fontSize);

    await page.getByLabel("Desktop ratio", { exact: true }).click();
    await page.getByRole("option", { name: /Golden Ratio/ }).click();

    await expect
      .poll(() => sample.evaluate((el) => getComputedStyle(el).fontSize))
      .not.toBe(before);
  });

  test("workspace nav still reaches Colour and Spacing from the type preview", async ({
    seededPage: page,
  }) => {
    await page
      .getByRole("navigation", { name: "Typography views" })
      .getByRole("button", { name: "Preview", exact: true })
      .click();
    await expect(
      page.getByRole("region", { name: "Type scale settings" }),
    ).toBeVisible();

    const workspaces = page.getByRole("navigation", {
      name: "Blueprint workspaces",
    });
    await expect(
      workspaces.getByRole("link", { name: "Preview" }),
    ).toBeVisible();

    await workspaces.getByRole("link", { name: "Colour" }).click();
    await expect(page).toHaveURL(/\/colour\/?$/);
    await expect(
      page.getByRole("heading", { name: "This slice isn't open yet" }),
    ).toBeVisible();

    await page
      .getByRole("navigation", { name: "Blueprint workspaces" })
      .getByRole("link", { name: "Typography" })
      .click();
    await page
      .getByRole("navigation", { name: "Typography views" })
      .getByRole("button", { name: "Preview", exact: true })
      .click();

    await page
      .getByRole("navigation", { name: "Blueprint workspaces" })
      .getByRole("link", { name: "Spacing" })
      .click();
    await expect(page).toHaveURL(/\/spacing\/?$/);
    await expect(
      page.getByRole("region", { name: "Generated spacing steps" }),
    ).toBeVisible();
  });

  test("the preview uses the same specimen the editor was typed with", async ({
    seededPage: page,
  }) => {
    const views = page.getByRole("navigation", { name: "Typography views" });
    await page.getByLabel("Specimen text").first().fill("ทดสอบ 12px");
    await views.getByRole("button", { name: "Specimen" }).click();

    const preview = page.getByRole("region", { name: "Type scale preview" });
    const fields = preview.getByRole("textbox", { name: "Specimen text" });
    await expect(fields.first()).toHaveValue("ทดสอบ 12px");
    await expect(fields.nth(1)).toHaveValue("ทดสอบ 12px");

    await fields.first().fill("How vexingly ไฟ");
    await expect(fields.nth(1)).toHaveValue("How vexingly ไฟ");

    await views.getByRole("button", { name: "Editor" }).click();
    await expect(
      page
        .getByRole("region", { name: "Generated type steps" })
        .getByRole("textbox", { name: "Specimen text" })
        .first(),
    ).toHaveValue("How vexingly ไฟ");

    await views.getByRole("button", { name: "Preview", exact: true }).click();
    await expect(
      preview.getByRole("heading", {
        name: "A type scale is a set of decisions, not a set of sizes",
        level: 1,
      }),
    ).toBeVisible();
    await expect(preview.getByText("How vexingly ไฟ")).toHaveCount(0);
  });

  test("offers phone, tablet and desktop frames, not arbitrary widths", async ({
    seededPage: page,
  }) => {
    const devices = page.getByRole("navigation", { name: "Preview devices" });
    /* View tabs live in the page header, the same slot Colour uses for
       Shade generator. Device frames sit on the typography toolbar. */
    await expect(
      page.getByRole("navigation", { name: "Typography views" }),
    ).toBeVisible();
    await expect(
      page.locator("header").filter({
        has: page.getByRole("navigation", { name: "Typography views" }),
      }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("region", { name: "Typography toolbar" })
        .getByRole("navigation", { name: "Preview devices" }),
    ).toBeVisible();
    await expect(devices.getByRole("button", { name: "Phone" })).toBeVisible();
    await expect(devices.getByRole("button", { name: "Tablet" })).toBeVisible();
    await expect(
      devices.getByRole("button", { name: "Desktop" }),
    ).toBeVisible();
    await expect(devices.getByRole("button")).toHaveCount(3);
    const [desktop, tablet, phone] = await Promise.all([
      devices
        .getByRole("button", { name: "Desktop", exact: true })
        .boundingBox(),
      devices.getByRole("button", { name: "Tablet" }).boundingBox(),
      devices.getByRole("button", { name: "Phone" }).boundingBox(),
    ]);
    expect(desktop).toBeTruthy();
    expect(tablet).toBeTruthy();
    expect(phone).toBeTruthy();
    expect(desktop!.x).toBeLessThan(tablet!.x);
    expect(tablet!.x).toBeLessThan(phone!.x);
    await expect(
      page.getByRole("group", { name: "Preview width" }),
    ).toHaveCount(0);

    await page
      .getByRole("navigation", { name: "Typography views" })
      .getByRole("button", { name: "Preview", exact: true })
      .click();
    await devices.getByRole("button", { name: "Phone" }).click();

    const stage = page.locator("[data-preview-device='phone']");
    await expect(stage).toBeVisible();
    await expect
      .poll(() => stage.evaluate((el) => getComputedStyle(el).maxWidth))
      .toBe("375px");
  });

  test("adds extra desktop frames from settings and keeps the required three", async ({
    seededPage: page,
  }) => {
    const devices = page.getByRole("navigation", { name: "Preview devices" });
    const settings = await openWorkspaceSettings(page);

    await expect(
      settings.getByRole("img", { name: "Phone cannot be removed" }),
    ).toBeVisible();
    await expect(
      settings.getByRole("img", { name: "Tablet cannot be removed" }),
    ).toBeVisible();
    await expect(
      settings.getByRole("img", { name: "Desktop cannot be removed" }),
    ).toBeVisible();
    await expect(
      settings.getByRole("checkbox", { name: "Tablet" }),
    ).toHaveCount(0);
    await expect(
      settings.getByRole("button", { name: "Remove Phone" }),
    ).toHaveCount(0);
    await expect(
      settings.getByRole("button", { name: "Remove Tablet" }),
    ).toHaveCount(0);
    await expect(
      settings.getByRole("button", { name: "Remove Desktop" }),
    ).toHaveCount(0);

    await settings.getByRole("button", { name: "Add desktop" }).click();
    await expect(
      devices.getByRole("button", { name: "Desktop 2" }),
    ).toBeVisible();
    await expect(devices.getByRole("button")).toHaveCount(4);
    const extra = await devices
      .getByRole("button", { name: "Desktop 2" })
      .boundingBox();
    const desktop = await devices
      .getByRole("button", { name: "Desktop", exact: true })
      .boundingBox();
    expect(extra).toBeTruthy();
    expect(desktop).toBeTruthy();
    expect(extra!.x).toBeLessThan(desktop!.x);

    await settings.getByRole("button", { name: "Add desktop" }).click();
    await expect(
      devices.getByRole("button", { name: "Desktop 3" }),
    ).toBeVisible();
    await expect(devices.getByRole("button")).toHaveCount(5);
    await expect(
      settings.getByRole("button", { name: "Add desktop" }),
    ).toBeDisabled();

    await settings.getByRole("button", { name: "Remove Desktop 2" }).click();
    await expect(
      devices.getByRole("button", { name: "Desktop 2" }),
    ).toBeVisible();
    await expect(
      devices.getByRole("button", { name: "Desktop 3" }),
    ).toHaveCount(0);
    await expect(devices.getByRole("button")).toHaveCount(4);

    await expect(devices.getByRole("button", { name: "Phone" })).toBeVisible();
    await expect(devices.getByRole("button", { name: "Tablet" })).toBeVisible();
    await expect(
      devices.getByRole("button", { name: "Desktop", exact: true }),
    ).toBeVisible();
  });

  test("regenerates steps when the base font size changes", async ({
    seededPage: page,
  }) => {
    const baseInput = page.getByLabel("Base font size");
    await baseInput.fill("20");
    await baseInput.blur();

    // Sizes render in the project unit, which defaults to rem: 20px / 16 root.
    await expect(
      page
        .getByRole("region", { name: "Generated type steps" })
        .getByText("1.25rem"),
    ).toBeVisible();
  });

  test("generates even sizes, with 11px as the only odd one", async ({
    seededPage: page,
  }) => {
    await page.getByRole("radio", { name: "PX" }).click();
    const steps = page.getByRole("region", { name: "Generated type steps" });

    const sizes = await steps.locator("code").allTextContents();
    expect(sizes.length).toBeGreaterThan(0);
    for (const size of sizes) {
      const px = Number(size.replace("px", ""));
      expect(px === 11 || px % 2 === 0).toBe(true);
    }

    // 25 is the tie on the default scale and resolves to the multiple of four.
    expect(sizes).toContain("24px");
    expect(sizes).not.toContain("26px");
  });

  test("shows step sizes in the chosen unit", async ({ seededPage: page }) => {
    const steps = page.getByRole("region", { name: "Generated type steps" });
    await expect(steps.getByText("1rem", { exact: true })).toBeVisible();

    // The unit chips sit above the steps, so no dialog is involved.
    await page.getByRole("radio", { name: "PX" }).click();

    await expect(steps.getByText("16px", { exact: true })).toBeVisible();
    await expect(steps.getByText("1rem", { exact: true })).toBeHidden();
  });

  test("renders the specimen text at every step", async ({
    seededPage: page,
  }) => {
    // Typed into one step row; every row shares the same value.
    await page.getByLabel("Specimen text").first().fill("Test ไฟหกฟ");

    const samples = page
      .getByRole("region", { name: "Generated type steps" })
      .getByLabel("Specimen text");
    expect(await samples.count()).toBeGreaterThan(1);
    // Every row follows, which is the point of editing in place.
    for (const sample of await samples.all()) {
      await expect(sample).toHaveValue("Test ไฟหกฟ");
    }
  });

  test("shows a warning when the scale ratio grows too fast", async ({
    seededPage: page,
  }) => {
    await page.getByLabel("Desktop ratio", { exact: true }).click();
    await page.getByRole("option", { name: /Golden Ratio/ }).click();

    /* The ratio is on Settings and what it raises is a panel over, which is
       the point of the count on the tab: the warning is somewhere else. */
    await expect(page.getByRole("tab", { name: /^Warnings/ })).toContainText(
      "1",
    );
    await showInspectorPanel(page, "Warnings");
    await expect(page.getByText(/grows quickly/i)).toBeVisible();
  });

  test("switches between Specimen and Preview from the view tabs", async ({
    seededPage: page,
  }) => {
    const views = page.getByRole("navigation", { name: "Typography views" });
    await views.getByRole("button", { name: "Specimen" }).click();
    const preview = page.getByRole("region", { name: "Type scale preview" });

    await expect(
      preview.getByRole("heading", { name: "display" }),
    ).toBeVisible();
    await expect(
      preview.getByRole("textbox", { name: "Specimen text" }).first(),
    ).toHaveValue(DEFAULT_SPECIMEN_TEXT);

    const title = "A type scale is a set of decisions, not a set of sizes";
    await views.getByRole("button", { name: "Preview", exact: true }).click();
    await expect(
      preview.getByRole("heading", { name: title, level: 1 }),
    ).toBeVisible();
    expect(await preview.getByRole("heading", { level: 1 }).count()).toBe(1);
    await expect(preview.getByText(DEFAULT_SPECIMEN_TEXT)).toHaveCount(0);
    await expect(preview.getByText("From: Blueprint")).toHaveCount(0);

    await expect(page.getByRole("button", { name: "Article" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Email" })).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Documentation" }),
    ).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Dashboard" })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole("button", { name: "Marketing page" }),
    ).toHaveCount(0);
    await expect(page.getByRole("button", { name: "ไทย" })).toHaveCount(0);
  });

  test("shows text colour, background colour and the preset on one toolbar", async ({
    seededPage: page,
  }) => {
    await page.getByRole("button", { name: "Preview", exact: true }).click();
    const preview = page.getByRole("region", { name: "Type scale preview" });
    const toolbar = page.getByRole("toolbar", { name: "Preview" });
    await expect(
      toolbar.getByRole("combobox", { name: "Text preset" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Article" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Email" })).toHaveCount(0);
    await expect(
      page.getByText(
        "Create a palette to preview this scale on your own colours.",
      ),
    ).toBeVisible();

    const tabs = page.getByRole("navigation", { name: "Typography views" });
    const previewBox = await preview.boundingBox();
    const toolbarBox = await toolbar.boundingBox();
    const tabsBox = await tabs.boundingBox();
    expect(previewBox).toBeTruthy();
    expect(toolbarBox).toBeTruthy();
    expect(tabsBox).toBeTruthy();
    expect(toolbarBox!.y).toBeGreaterThan(tabsBox!.y);
    expect(previewBox!.y).toBeGreaterThan(toolbarBox!.y);
    await expect(toolbar.locator("xpath=..")).not.toHaveCSS(
      "position",
      "sticky",
    );

    const before = toolbarBox!.y;
    await preview.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    const after = await toolbar.boundingBox();
    expect(after).toBeTruthy();
    expect(after!.y).toBe(before);
  });

  test("applies a workspace role to the selected block", async ({
    seededPage: page,
  }) => {
    await page.getByRole("button", { name: "Preview", exact: true }).click();
    const preview = page.getByRole("region", { name: "Type scale preview" });
    const paragraph = preview.getByText(
      "Body text is the size most people spend the most time with",
    );
    await paragraph.click();
    const stylePicker = page.getByRole("combobox", { name: "Text preset" });
    await expect(stylePicker).toBeVisible();
    await stylePicker.click();
    await page.getByRole("option", { name: "h2", exact: true }).click();

    await expect(
      preview.getByRole("heading", {
        name: /Body text is the size most people spend the most time with/,
        level: 2,
      }),
    ).toBeVisible();
  });

  test("keeps document edits after a reload", async ({ seededPage: page }) => {
    await page.getByRole("button", { name: "Preview", exact: true }).click();
    const preview = page.getByRole("region", { name: "Type scale preview" });
    const title = preview.getByRole("heading", { level: 1 });
    await title.click();
    await title.fill("A scale I actually wrote");

    await page.reload();
    await page.getByRole("button", { name: "Preview", exact: true }).click();

    await expect(
      page
        .getByRole("region", { name: "Type scale preview" })
        .getByRole("heading", {
          name: "A scale I actually wrote",
          level: 1,
        }),
    ).toBeVisible();
  });

  test("Preview is the article document, not a template chip", async ({
    seededPage: page,
  }) => {
    await page.getByRole("button", { name: "Preview", exact: true }).click();

    await expect(
      page
        .getByRole("region", { name: "Type scale preview" })
        .getByRole("heading", { level: 1 }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Article" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Email" })).toHaveCount(0);
  });

  test("migrates a project saved before the merged model", async ({
    seededPage: page,
  }) => {
    // The fixture seeds the pre-merge shape: roleStyles and a flat fontFamily.
    // Reaching the editor at all means the migration ran.
    const settings = page.getByRole("region", { name: "Type scale settings" });
    /* Geist Sans is a local face, not a Google one. It still has to show, or
       the field reads as empty and the font looks lost. Typeahead presents a
       selection as a token, not as the input's value. */
    await expect(
      settings.getByRole("button", { name: "Geist Sans" }),
    ).toBeVisible();
    /* A standing fact about the family rather than something to act on, so
       it is read in the picker, not on the card. */
    await expect(settings.getByText(/is not a Google font/)).toBeHidden();
    await openSlot(settings, "Base font");
    await expect(settings.getByText(/is not a Google font/)).toBeVisible();

    /* And the roles the old shape carried, which live a panel over. */
    await showInspectorPanel(page, "Groups");
    await expect(settings.getByRole("group", { name: "Body" })).toBeVisible();
  });

  test("groups roles and adds one to a group", async ({ seededPage: page }) => {
    await showInspectorPanel(page, "Groups");
    const settings = page.getByRole("region", { name: "Type scale settings" });

    for (const group of ["Display", "H", "Body", "Label", "Caption"]) {
      await expect(
        settings.getByRole("group", { name: group, exact: true }),
      ).toBeVisible();
    }

    const before = await settings.getByLabel(/ font weight$/).count();
    await settings
      .getByRole("group", { name: "Body", exact: true })
      .getByRole("button", { name: "Add" })
      .click();

    await expect(settings.getByLabel(/ font weight$/)).toHaveCount(before + 1);
  });

  test("adds a size group's role at the top, and shows it arriving", async ({
    seededPage: page,
  }) => {
    /* Sizes count up from xs at the bottom, so a new role goes on top as the
       next size up and no name below it moves. That puts it away from the Add
       button under the group, so it is marked as just added and scrolled to. */
    await showInspectorPanel(page, "Groups");
    const settings = page.getByRole("region", { name: "Type scale settings" });
    const body = settings.getByRole("group", { name: "Body", exact: true });
    const names = body.locator("[class*=roleSettingLabel]");

    await body.getByLabel("body indexing", { exact: true }).click();
    await page.getByRole("option", { name: "Size", exact: true }).click();

    const add = body.getByRole("button", { name: "Add a role to Body" });
    await add.click();
    await expect(names).toHaveText(["body-sm", "body-xs"]);
    await add.click();
    await expect(names).toHaveText(["body-md", "body-sm", "body-xs"]);

    const added = body.locator("[data-just-added]");
    await expect(added).toHaveCount(1);
    await expect(added.locator("[class*=roleSettingLabel]")).toHaveText(
      "body-md",
    );
    await expect(names.first()).toBeInViewport();
  });

  test("keeps the heading group numbered, with its indexing off", async ({
    seededPage: page,
  }) => {
    /* h1 to h6 are names, so Size would change nothing. */
    await showInspectorPanel(page, "Groups");
    const settings = page.getByRole("region", { name: "Type scale settings" });
    const h = settings.getByRole("group", { name: "H", exact: true });
    const indexing = h.getByLabel("h indexing", { exact: true });

    await expect(indexing).toBeDisabled();
    await expect(indexing).toContainText("Number");
    await expect(
      settings
        .getByRole("group", { name: "Body", exact: true })
        .getByLabel("body indexing", { exact: true }),
    ).toBeEnabled();
  });

  test("removes a role", async ({ seededPage: page }) => {
    await showInspectorPanel(page, "Groups");
    const settings = page.getByRole("region", { name: "Type scale settings" });
    const before = await settings.getByLabel(/ font weight$/).count();

    // exact, or this also matches the group's own "Remove Caption group".
    await settings
      .getByRole("button", { name: "Remove caption", exact: true })
      .click();

    await expect(settings.getByLabel(/ font weight$/)).toHaveCount(before - 1);
    await expect(
      settings.getByRole("button", { name: "Remove caption", exact: true }),
    ).toBeHidden();
  });

  test("derives heading elements from position", async ({
    seededPage: page,
  }) => {
    await page.getByRole("button", { name: "Specimen" }).click();
    const preview = page.getByRole("region", { name: "Type scale preview" });

    // Migrated legacy heading and title become h1 and h2.
    await expect(preview.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(
      preview.getByRole("heading", { level: 2 }).first(),
    ).toBeVisible();
  });

  test("heading offers no element picker, because h1-h6 is derived", async ({
    seededPage: page,
  }) => {
    const settings = page.getByRole("region", { name: "Type scale settings" });
    // The element is derived everywhere now, so no role offers the control.
    await expect(settings.getByLabel(/ element$/)).toHaveCount(0);
  });

  test("adds a group, renames it, and moves it", async ({
    seededPage: page,
  }) => {
    await showInspectorPanel(page, "Groups");
    const settings = page.getByRole("region", { name: "Type scale settings" });
    await settings.getByRole("button", { name: "Add group" }).click();

    const nameField = settings.getByLabel(/^group-\d+ name$/);
    await expect(nameField).toBeVisible();
    await nameField.fill("Overline");

    await expect(
      settings.getByRole("group", { name: "Overline" }),
    ).toBeVisible();
    await expect(
      settings.getByRole("button", { name: "Reorder Overline group" }),
    ).toBeVisible();
  });

  test("every group can be renamed, moved and removed", async ({
    seededPage: page,
  }) => {
    await showInspectorPanel(page, "Groups");
    // H and Body are only defaults now, not locked.
    const settings = page.getByRole("region", { name: "Type scale settings" });
    for (const group of ["H", "Body"]) {
      await expect(
        settings.getByLabel(`${group.toLowerCase()} name`),
      ).toBeVisible();
      await expect(
        settings.getByRole("button", { name: `Reorder ${group} group` }),
      ).toBeVisible();
      await expect(
        settings.getByRole("button", { name: `Remove ${group} group` }),
      ).toBeVisible();
    }
  });

  test("a group named h numbers its roles without a dash", async ({
    seededPage: page,
  }) => {
    await showInspectorPanel(page, "Groups");
    const settings = page.getByRole("region", { name: "Type scale settings" });
    await settings
      .getByRole("group", { name: "H", exact: true })
      .getByRole("button", { name: "Add" })
      .click();

    // h1, h2 — not h-1, h-2.
    await expect(settings.getByLabel("h2 size")).toBeVisible();
    await expect(settings.getByLabel("h-2 size")).toBeHidden();
  });

  test("a new role reuses its sibling's step rather than growing the ramp", async ({
    seededPage: page,
  }) => {
    await showInspectorPanel(page, "Groups");
    const settings = page.getByRole("region", { name: "Type scale settings" });
    await settings
      .getByRole("group", { name: "Body", exact: true })
      .getByRole("button", { name: "Add" })
      .click();

    // Reindexed to body-1 and body-2; both sit on the same step.
    await expect(settings.getByLabel("body-1 size")).toContainText("+0");
    await expect(settings.getByLabel("body-2 size")).toContainText("+0");
  });

  test("a size can be typed, which unlinks it from the ramp", async ({
    seededPage: page,
  }) => {
    await showInspectorPanel(page, "Groups");
    const settings = page.getByRole("region", { name: "Type scale settings" });

    // 14 is not on the default ramp, so this is only reachable by typing.
    await fillHybridNumber(page, "body size", "14");

    await expect(
      settings.getByRole("textbox", { name: "body size" }),
    ).toHaveValue("14");
    await expect(
      settings.getByRole("textbox", { name: "body size" }),
    ).not.toContainText("+");
  });

  test("picking a step relinks the size to the ramp", async ({
    seededPage: page,
  }) => {
    await showInspectorPanel(page, "Groups");
    const settings = page.getByRole("region", { name: "Type scale settings" });
    await fillHybridNumber(page, "body size", "14");

    await settings.getByRole("button", { name: "Apply preset" }).click();
    await page.getByRole("option", { name: /^\+1/ }).click();

    await expect(settings.getByLabel("body size")).toContainText("+1");
  });

  test("a typed size reads as an override, and its ✕ goes back to the step", async ({
    seededPage: page,
  }) => {
    await showInspectorPanel(page, "Groups");
    const settings = page.getByRole("region", { name: "Type scale settings" });
    const clear = settings.getByRole("button", { name: "Clear body size" });

    /* Bound to a step: the chip, and nothing to clear. */
    await expect(clear).toHaveCount(0);

    await fillHybridNumber(page, "body size", "14");
    const typed = settings.getByRole("textbox", { name: "body size" });
    await expect(typed).toHaveAttribute("data-override", "true");
    await expect(clear).toBeVisible();

    await clear.click();
    await expect(settings.getByLabel("body size")).toContainText("+0");
    await expect(clear).toHaveCount(0);
  });

  test("typing a size on phone leaves desktop bound to the step", async ({
    seededPage: page,
  }) => {
    await showInspectorPanel(page, "Groups");
    const settings = page.getByRole("region", { name: "Type scale settings" });
    const devices = page.getByRole("navigation", { name: "Preview devices" });

    await devices.getByRole("button", { name: "Phone" }).click();
    await fillHybridNumber(page, "body size", "14");
    await expect(
      settings.getByRole("textbox", { name: "body size" }),
    ).toHaveValue("14");
    await expect(
      settings.getByRole("textbox", { name: "body size" }),
    ).not.toContainText("+");

    await devices.getByRole("button", { name: "Desktop", exact: true }).click();
    await expect(settings.getByLabel("body size")).toContainText("+0");
  });

  test("loads a project saved by the previous release", async ({ page }) => {
    /* That release stored a system with no `groups`, roles keyed by `group`,
       and absolute steps. Reading one crashed the editor on
       system.groups.map. Seeded directly because the shared fixture writes the
       older, pre-merge shape and so never reproduced it. */
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "blueprint.typography-project.v1",
        JSON.stringify({
          system: {
            id: "s",
            name: "Saved earlier",
            baseFontSizePx: 16,
            ratio: 1.25,
            stepCount: 9,
            breakpointPx: 768,
            fonts: [
              {
                id: "base",
                name: "Base",
                families: ["Inter"],
                source: "system",
              },
            ],
            roles: [
              {
                id: "body",
                name: "body",
                group: "body",
                element: "p",
                fontId: "base",
                fontWeight: 400,
                textTransform: "none",
                step: 4,
                desktop: {
                  fontSizePx: 16,
                  lineHeight: 1.5,
                  letterSpacingPx: 0,
                },
                mobile: { fontSizePx: 16, lineHeight: 1.5, letterSpacingPx: 0 },
              },
            ],
          },
          unit: "rem",
          specimenText: "Test",
          template: "specimen",
        }),
      );
    });
    await page.goto("/typography");

    const settings = page.getByRole("region", { name: "Type scale settings" });
    await showInspectorPanel(page, "Groups");
    await expect(settings.getByRole("group", { name: "Body" })).toBeVisible();
    await expect(settings.getByLabel("body font weight")).toHaveValue("400");
    await expect(page.getByLabel("Project name")).toHaveValue("Saved earlier");
  });

  test("renaming a group renames its roles", async ({ seededPage: page }) => {
    await showInspectorPanel(page, "Groups");
    const settings = page.getByRole("region", { name: "Type scale settings" });
    await settings.getByLabel("caption name").fill("Overline");
    await settings.getByLabel("caption name").blur();

    await expect(
      settings.getByRole("button", { name: "Remove overline", exact: true }),
    ).toBeVisible();
  });

  test("applies a group rename on Enter", async ({ seededPage: page }) => {
    await showInspectorPanel(page, "Groups");
    const settings = page.getByRole("region", { name: "Type scale settings" });
    await settings.getByLabel("caption name").fill("Overline");
    await settings.getByLabel("caption name").press("Enter");

    // No need to click elsewhere for it to take effect.
    await expect(
      settings.getByRole("button", { name: "Remove overline", exact: true }),
    ).toBeVisible();
  });

  test("keeps focus while a group name is typed", async ({
    seededPage: page,
  }) => {
    await showInspectorPanel(page, "Groups");
    /* The group id is this row's React key, so renaming per keystroke remounted
       the field and focus was lost after one character. */
    const settings = page.getByRole("region", { name: "Type scale settings" });
    const field = settings.getByLabel("caption name");

    await field.click();
    await page.keyboard.type("Overline");

    await expect(field).toBeFocused();
    await expect(field).toHaveValue("CaptionOverline");
  });

  test("the size menu lists the largest step first", async ({
    seededPage: page,
  }) => {
    await showInspectorPanel(page, "Groups");
    const settings = page.getByRole("region", { name: "Type scale settings" });
    await settings.getByLabel("body size").click();

    const options = page.getByRole("option");
    // Largest first, matching the step list on the left. Typing a size is how
    // a role leaves the ramp, so Custom is not a row in this list.
    expect(await options.first().textContent()).toContain("+");
    expect(await options.last().textContent()).toContain("-");
  });

  test("panels scroll on their own, the page does not", async ({
    seededPage: page,
  }) => {
    const pageScrolls = await page.evaluate(
      () =>
        document.documentElement.scrollHeight >
        document.documentElement.clientHeight + 1,
    );
    expect(pageScrolls).toBe(false);

    // Each panel owns its own overflow, so they can be driven separately.
    for (const name of ["Generated type steps", "Type scale settings"]) {
      const overflow = await page
        .getByRole("region", { name })
        .evaluate((el) => getComputedStyle(el).overflowY);
      expect(overflow).toBe("auto");
    }
  });

  test("picks a Google font and loads it at runtime", async ({
    seededPage: page,
  }) => {
    const settings = page.getByRole("region", { name: "Type scale settings" });
    await searchFont(settings, "Base font", "Sarabun");
    await page.getByRole("option", { name: "Sarabun" }).first().click();

    /* Asserting the outcome rather than the widget: next/font cannot load a
       runtime choice, so the studio injects the stylesheet itself, and the
       chosen family reaching that URL is what proves the pick took effect. */
    await expect
      .poll(() =>
        page.evaluate(() =>
          [...document.querySelectorAll('link[href*="fonts.googleapis.com"]')]
            .map((link) => link.getAttribute("href") ?? "")
            .join(" "),
        ),
      )
      .toMatch(/Sarabun/);
  });

  test("a new scale ships a Display group and two fonts", async ({ page }) => {
    /* Display is the expressive brand face used big; headings and body use the
       readable one, because a blog still needs a legible h1. Home create is
       the only door; the leftover type form is gone. */
    await page.goto("/");
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
    await createWorkspaceFromHome(page, "Pairing");
    await page.goto("/typography");
    await expect(
      page.getByRole("region", { name: "Generated type steps" }),
    ).toBeVisible();

    const settings = page.getByRole("region", { name: "Type scale settings" });
    await showInspectorPanel(page, "Groups");
    await expect(
      /* Exact: a Home create now starts on Primer, whose Enterprise groups
         add a "Subtitle display" beside it. */
      settings.getByRole("group", { name: "Display", exact: true }),
    ).toBeVisible();
    await expect(
      /* Enterprise numbers its displays: display-1 and display-2. */
      settings.getByLabel("display-1 font", { exact: true }),
    ).toContainText("Display");
    await expect(settings.getByLabel("h1 font", { exact: true })).toContainText(
      "Main",
    );
  });

  test("loads the bilingual fallback, not only the primary", async ({
    seededPage: page,
  }) => {
    /* A fallback that is never downloaded cannot be fallen back to: the browser
       skips it and lands on the generic, which reads as the fallback being
       ignored. */
    const settings = page.getByRole("region", { name: "Type scale settings" });

    await searchFont(settings, "Base font", "Orbitron");
    await page.getByRole("option", { name: "Orbitron" }).first().click();
    await openFallback(settings);
    await searchFont(settings, "Base fallback 1", "Kanit");
    await page.getByRole("option", { name: "Kanit" }).first().click();

    await expect
      .poll(() =>
        page.evaluate(() =>
          [...document.querySelectorAll("link[href*='fonts.googleapis.com']")]
            .map((link) => link.getAttribute("href") ?? "")
            .join(" "),
        ),
      )
      .toMatch(/Kanit/);
  });

  test("folds the Fonts panel from its trigger, open to start", async ({
    seededPage: page,
  }) => {
    const settings = page.getByRole("region", { name: "Type scale settings" });
    const fonts = settings.getByRole("region", { name: "Fonts" });
    const trigger = fonts.getByRole("button", { name: "Fonts" });
    const addFont = fonts.getByRole("button", { name: "Add font" });

    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(addFont).toBeVisible();
    /* A section header, not the small muted caption plain groups use. */
    const label = trigger.locator("[class*=groupTrigger]");
    await expect(label).toHaveCSS("font-size", "14px");
    await expect(label).toHaveCSS("font-weight", "600");

    /* The stacks and Add font are spaced apart, as the group's children
       were before they moved inside the collapsible. */
    const gaps = await fonts.evaluate((section) => {
      const items = [
        ...section.querySelectorAll("section[aria-label$=' stack'], button"),
      ].filter((node) =>
        /stack$|^Add font$/.test(
          node.getAttribute("aria-label") ?? node.textContent ?? "",
        ),
      );
      return items
        .slice(1)
        .map((node, index) =>
          Math.round(
            node.getBoundingClientRect().top -
              items[index]!.getBoundingClientRect().bottom,
          ),
        );
    });
    expect(gaps.length).toBeGreaterThan(0);
    for (const gap of gaps) expect(gap).toBe(12);

    /* Room between the header and the first stack. */
    const headerRoom = await fonts.evaluate((section) => {
      const button = section.querySelector("button[aria-expanded]")!;
      const stack = section.querySelector("section[aria-label$=' stack']")!;
      return Math.round(
        stack.getBoundingClientRect().top -
          button.getBoundingClientRect().bottom,
      );
    });
    expect(headerRoom).toBeGreaterThanOrEqual(12);

    /* It folds over time, not at once: sampled frame by frame after the
       click, the panel passes through heights between open and shut. The
       suite runs with motion reduced, so this asks for motion first. */
    const fold = () =>
      fonts.evaluate(async (section) => {
        const button = section.querySelector(
          "button[aria-expanded]",
        ) as HTMLButtonElement;
        const content = button.nextElementSibling as HTMLElement;
        const full = content.getBoundingClientRect().height;
        button.click();
        const seen: number[] = [];
        for (let frame = 0; frame < 30; frame += 1) {
          await new Promise((resolve) => requestAnimationFrame(resolve));
          seen.push(Math.round(content.getBoundingClientRect().height));
        }
        return { full, seen };
      });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    const eased = await fold();
    expect(
      /* Well past the header padding, which eases too: the contents
         themselves fold, not only the room above them. */
      eased.seen.some((height) => height > 24 && height < eased.full - 24),
    ).toBe(true);
    expect(eased.seen.at(-1)).toBe(0);
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(addFont).toBeHidden();
    /* Folded, nothing of the panel paints: clipped at its exact edge, so
       the first card's top border cannot show as a line under the header,
       faded and hidden. */
    const folded = await fonts.evaluate((section) => {
      const content = section.querySelector("button[aria-expanded]")!
        .nextElementSibling as HTMLElement;
      const child = getComputedStyle(content.firstElementChild!);
      const css = getComputedStyle(content);
      return {
        height: Math.round(content.getBoundingClientRect().height),
        clipMargin: child.overflowClipMargin,
        opacity: css.opacity,
        visibility: css.visibility,
      };
    });
    expect(folded).toEqual({
      height: 0,
      clipMargin: "0px",
      opacity: "0",
      visibility: "hidden",
    });

    await trigger.click();
    await expect(addFont).toBeVisible();

    /* Asked for less motion, it folds at once. */
    await page.emulateMedia({ reducedMotion: "reduce" });
    const instant = await fold();
    expect(instant.seen[0]).toBe(0);
  });

  test("adds a font entry and assigns a role to it", async ({
    seededPage: page,
  }) => {
    /* Without a second entry the per-role Font dropdown has one option, so a
       display face and a readable one cannot coexist. */
    const settings = page.getByRole("region", { name: "Type scale settings" });
    await settings.getByRole("button", { name: "Add font" }).click();

    const name = settings.getByLabel("font-2 name");
    await expect(name).toBeVisible();
    await name.fill("Display");

    // The name is what the role dropdown offers, a panel over.
    await showInspectorPanel(page, "Groups");
    await settings.getByLabel("h1 font", { exact: true }).click();
    await expect(page.getByRole("option", { name: "Display" })).toBeVisible();
  });

  test("moves roles off a font entry that is removed", async ({
    seededPage: page,
  }) => {
    const settings = page.getByRole("region", { name: "Type scale settings" });
    await settings.getByRole("button", { name: "Add font" }).click();
    await settings.getByLabel("font-2 name").fill("Display");

    await showInspectorPanel(page, "Groups");
    await settings.getByLabel("h1 font", { exact: true }).click();
    await page.getByRole("option", { name: "Display" }).click();

    await showInspectorPanel(page, "Settings");
    await settings.getByRole("button", { name: "Remove Display font" }).click();
    await showInspectorPanel(page, "Groups");

    // A role pointing at a deleted font would have nothing to render with.
    await expect(settings.getByLabel("h1 font", { exact: true })).toContainText(
      "Base",
    );
  });

  test("keeps the last font entry", async ({ seededPage: page }) => {
    const settings = page.getByRole("region", { name: "Type scale settings" });
    await expect(
      settings.getByRole("button", { name: /^Remove .* font$/ }),
    ).toHaveCount(0);
  });

  test("previews the step list in the chosen font entry", async ({
    seededPage: page,
  }) => {
    /* Steps are sizes shared by several roles, so they have no font of their
       own. Without this you cannot see a display face in the step list at all. */
    const settings = page.getByRole("region", { name: "Type scale settings" });
    const steps = page.getByRole("region", { name: "Generated type steps" });

    // One entry means no choice to make, so the control stays hidden.
    await expect(
      steps.getByRole("radiogroup", { name: "Preview font" }),
    ).toHaveCount(0);

    await settings.getByRole("button", { name: "Add font" }).click();
    await settings.getByLabel("font-2 name").fill("Display");
    await searchFont(settings, "Display font", "Orbitron");
    await page.getByRole("option", { name: "Orbitron" }).first().click();

    await steps.getByRole("radio", { name: "Display" }).click();
    await expect(steps.getByLabel("Specimen text").first()).toHaveCSS(
      "font-family",
      /Orbitron/,
    );
  });

  test("offers only the weights a family actually ships", async ({
    seededPage: page,
  }) => {
    /* More than half the catalogue ships one weight, so a fixed 100-900 control
       would offer weights the browser could only fake. */
    const settings = page.getByRole("region", { name: "Type scale settings" });
    const steps = page.getByRole("region", { name: "Generated type steps" });

    await searchFont(settings, "Base font", "Orbitron");
    await page.getByRole("option", { name: "Orbitron" }).first().click();

    await steps.getByLabel("Preview weight").click();
    const options = await page.getByRole("option").allTextContents();
    // Orbitron ships 400-900. There is no 100.
    expect(options).toContain("400");
    expect(options).toContain("900");
    expect(options).not.toContain("100");
  });

  test("requests the weight it previews", async ({ seededPage: page }) => {
    const settings = page.getByRole("region", { name: "Type scale settings" });
    const steps = page.getByRole("region", { name: "Generated type steps" });

    await searchFont(settings, "Base font", "Orbitron");
    await page.getByRole("option", { name: "Orbitron" }).first().click();
    await steps.getByLabel("Preview weight").click();
    await page.getByRole("option", { name: "900", exact: true }).click();

    /* Otherwise the step list renders a weight that was never downloaded and
       the browser draws a synthetic one. */
    await expect
      .poll(() =>
        page.evaluate(() =>
          [...document.querySelectorAll("link[href*='fonts.googleapis.com']")]
            .map((link) => link.getAttribute("href") ?? "")
            .join(" "),
        ),
      )
      .toMatch(/Orbitron[^&]*900/);
  });
});

test.describe("The font picker in a chip", () => {
  test("opens on the list with the search focused", async ({
    seededPage: page,
  }) => {
    const settings = page.getByRole("region", { name: "Type scale settings" });
    await settings.getByRole("button", { name: /^Base font: / }).click();

    /* One click, and the families are there: no field to click into first. */
    await expect(page.getByRole("option").first()).toBeVisible();
    /* And none lit: a highlight on the first read as it being hovered. */
    await expect(page.locator("[role='option'][data-active]")).toHaveCount(0);
    const input = settings.getByLabel("Base font", { exact: true });
    await expect(input).toBeFocused();
    /* Typed straight into a beat later, as a hand would, with no click on
       the field: focus that something else took would fail here. */
    await page.waitForTimeout(300);
    await page.keyboard.type("Lor");
    await expect(input).toHaveValue("Lor");
    await expect(
      page.getByRole("option", { name: "Lora", exact: true }),
    ).toBeVisible();
  });

  test("leaves no ghost space under the chips", async ({
    seededPage: page,
  }) => {
    /* Each slot's hidden file input sat in a wrapper that took the card's
       gap, a blank row under the chips per slot. */
    const stack = page
      .getByRole("region", { name: "Type scale settings" })
      .getByRole("region", { name: "Base stack" });
    const chip = stack.getByRole("button", { name: /^Add a fallback to / });
    const card = (await stack.boundingBox())!;
    const row = (await chip.boundingBox())!;
    const padding = await stack.evaluate((el) =>
      parseFloat(getComputedStyle(el).paddingBottom),
    );
    const border = await stack.evaluate((el) =>
      parseFloat(getComputedStyle(el).borderBottomWidth),
    );
    /* A note under the chips would be a real row; the seeded stack has none
       unless its family cannot be previewed, which says so on the card. */
    const notes = await stack.locator("p").count();
    if (notes === 0) {
      expect(card.y + card.height - (row.y + row.height)).toBeLessThanOrEqual(
        padding + border + 1,
      );
    }
  });

  test("marks the family the slot holds", async ({ seededPage: page }) => {
    const settings = page.getByRole("region", { name: "Type scale settings" });
    await searchFont(settings, "Base font", "Lora");
    await page.getByRole("option", { name: "Lora", exact: true }).click();

    await searchFont(settings, "Base font", "Lora");
    await expect(
      page.getByRole("option", { name: "Lora", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
  });

  test("its clear empties the search and leaves the slot alone", async ({
    seededPage: page,
  }) => {
    const settings = page.getByRole("region", { name: "Type scale settings" });
    const stack = settings.getByRole("region", { name: "Base stack" });
    await searchFont(settings, "Base font", "Sarabun");
    await page.getByRole("option", { name: "Sarabun" }).first().click();
    await expect(page.getByRole("option")).toHaveCount(0);
    const before = await storedFamilies(page);

    const input = await searchFont(settings, "Base font", "Kan");
    await settings.getByRole("button", { name: "Clear search" }).click();

    await expect(input).toHaveValue("");
    await expect(input).toBeFocused();
    await expect(page.getByRole("option").first()).toBeVisible();
    await expect(
      stack.getByRole("button", { name: "Base font: Sarabun" }),
    ).toBeVisible();
    expect(await storedFamilies(page)).toEqual(before);
  });

  test("picks from the keyboard, and Escape closes it", async ({
    seededPage: page,
  }) => {
    const settings = page.getByRole("region", { name: "Type scale settings" });
    const chip = settings.getByRole("button", { name: /^Base font: / });
    await searchFont(settings, "Base font", "Orbitron");
    await page.keyboard.press("Enter");
    await expect(chip).toHaveAccessibleName("Base font: Orbitron");
    await expect(page.getByRole("option")).toHaveCount(0);
    await openSlot(settings, "Base font");
    await expect(page.getByRole("option").first()).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("option")).toHaveCount(0);
  });
});

test.describe("Where a Selector menu opens", () => {
  /*
   * A Selector menu is placed by CSS anchor positioning and then shifted by a
   * JS-measured margin, and the two are meant to compose: the shift is what
   * puts the selected item over the trigger, macOS style, and what keeps a
   * long menu on screen.
   *
   * So the menu deliberately overlaps its trigger, and a gap is the wrong
   * thing to measure. What went wrong once was a menu at the top of the
   * window, nowhere near what opened it — that is what this pins.
   */
  const openMenuBox = (page: import("@playwright/test").Page) =>
    page.evaluate(() => {
      const open = [...document.querySelectorAll("[popover]")].find((el) =>
        (el as HTMLElement).matches(":popover-open"),
      ) as HTMLElement | undefined;
      if (!open) return null;
      const box = open.getBoundingClientRect();
      return {
        top: box.top,
        bottom: box.bottom,
        viewportHeight: window.innerHeight,
      };
    });

  const expectAgainstTrigger = async (
    page: import("@playwright/test").Page,
    trigger: Locator,
  ) => {
    const menu = await openMenuBox(page);
    expect(menu).not.toBeNull();
    const anchor = (await trigger.boundingBox())!;

    /* Touching the trigger, on one side or overlapping it. 40px of slack for
       the spacing token and the popover's border, either way round — whether
       it opens below, above, or over is the browser's call and the JS's, and
       not what this is pinning down. Broken, the menu was a screen away. */
    expect(menu!.bottom).toBeGreaterThan(anchor.y - 40);
    expect(menu!.top).toBeLessThan(anchor.y + anchor.height + 40);

    // And on screen, which is what the bug most visibly broke.
    expect(menu!.top).toBeGreaterThanOrEqual(0);
    expect(menu!.bottom).toBeLessThanOrEqual(menu!.viewportHeight + 1);
  };

  test("sits against its trigger rather than the top of the window", async ({
    seededPage: page,
  }) => {
    const settings = page.getByRole("region", { name: "Type scale settings" });
    /* The ratio field. A bound chip opens the preset list; the option role is
       what this used to get from a Selector. */
    const trigger = settings.getByLabel("Desktop ratio", { exact: true });

    await trigger.click();
    await expect(page.getByRole("option").first()).toBeVisible();
    await expectAgainstTrigger(page, trigger);
  });

  test("stays against it with no room below, and on every reopen", async ({
    seededPage: page,
  }) => {
    // Short enough that the menu has to flip above the trigger.
    await page.setViewportSize({ width: 1280, height: 560 });
    const settings = page.getByRole("region", { name: "Type scale settings" });
    /* The ratio field. A bound chip opens the preset list; the option role is
       what this used to get from a Selector. */
    const trigger = settings.getByLabel("Desktop ratio", { exact: true });
    await trigger.evaluate((el) =>
      el.scrollIntoView({ block: "center", inline: "nearest" }),
    );

    /* Twice, because the first open was the worst of it: the menu had not been
       laid out, so the margin was measured against a height it did not have. */
    for (let open = 1; open <= 2; open += 1) {
      /* With a retry: the second open comes straight after an Escape, and a
         click under 100ms after a popover closes is dropped while Astryx
         waits for the browser's asynchronous toggle event. No hand is that
         fast. A menu that never reopens still fails. */
      await expect(async () => {
        await trigger.click();
        await expect(page.getByRole("option").first()).toBeVisible({
          timeout: 1000,
        });
      }).toPass({ timeout: 5000 });
      await expectAgainstTrigger(page, trigger);
      await page.keyboard.press("Escape");
      await expect(page.getByRole("option")).toHaveCount(0);
    }
  });
});

test.describe("Undo and redo", () => {
  const weights = (page: import("@playwright/test").Page) =>
    page
      .getByRole("region", { name: "Type scale settings" })
      .getByLabel(/ font weight$/);

  test.beforeEach(async ({ seededPage: page }) => {
    await showInspectorPanel(page, "Groups");
  });

  test("undoes an added role, and redoes it", async ({ seededPage: page }) => {
    const before = await weights(page).count();

    await page.getByRole("button", { name: "Add a role to Body" }).click();
    await expect(weights(page)).toHaveCount(before + 1);

    /* The button keeps focus, which is not a text field: the shortcut is ours. */
    await page.keyboard.press("Control+z");
    await expect(weights(page)).toHaveCount(before);

    await page.keyboard.press("Control+Shift+z");
    await expect(weights(page)).toHaveCount(before + 1);
  });

  test("brings a removed role back", async ({ seededPage: page }) => {
    const settings = page.getByRole("region", { name: "Type scale settings" });
    const remove = settings.getByRole("button", {
      name: "Remove caption",
      exact: true,
    });
    const before = await weights(page).count();

    await remove.click();
    await expect(remove).toBeHidden();
    await expect(weights(page)).toHaveCount(before - 1);

    await page.keyboard.press("Control+z");
    await expect(remove).toBeVisible();
    await expect(weights(page)).toHaveCount(before);

    /* And redo takes it away again. */
    await page.keyboard.press("Control+Shift+z");
    await expect(remove).toBeHidden();
  });

  test("undoes one edit at a time, in order", async ({ seededPage: page }) => {
    const before = await weights(page).count();
    const add = page.getByRole("button", { name: "Add a role to Body" });

    await add.click();
    await add.click();
    await expect(weights(page)).toHaveCount(before + 2);

    await page.keyboard.press("Control+z");
    await expect(weights(page)).toHaveCount(before + 1);
    await page.keyboard.press("Control+z");
    await expect(weights(page)).toHaveCount(before);
    /* Nothing further to undo: the shortcut does nothing. */
    await page.keyboard.press("Control+z");
    await expect(weights(page)).toHaveCount(before);
  });

  test("leaves a text field its own undo", async ({ seededPage: page }) => {
    const before = await weights(page).count();
    await page.getByRole("button", { name: "Add a role to Body" }).click();
    await expect(weights(page)).toHaveCount(before + 1);

    /* In a field, Ctrl+Z is the browser's, for the text typed there. */
    await page.getByLabel("body name", { exact: true }).focus();
    await page.keyboard.press("Control+z");
    await expect(weights(page)).toHaveCount(before + 1);
  });

  test("keeps the desktop ratio and the system's together", async ({
    seededPage: page,
  }) => {
    const ratios = async () => {
      const stored = await readStoredWorkspace(page);
      const desktop = stored.previewDevices.find(
        (device: { id: string }) => device.id === "desktop",
      );
      return [stored.typography.system.ratio, desktop.ratio];
    };
    await showInspectorPanel(page, "Settings");
    const [systemBefore, desktopBefore] = await ratios();
    expect(systemBefore).toBe(desktopBefore);

    await page.getByLabel("Desktop ratio", { exact: true }).click();
    await page.getByRole("option", { name: /Golden Ratio/ }).click();
    await expect.poll(async () => (await ratios())[0]).not.toBe(systemBefore);

    /* Focus off the field, then undo: both go back, and stay equal. */
    await page.getByRole("heading", { name: "Scale" }).click();
    await page.keyboard.press("Control+z");
    await expect.poll(ratios).toEqual([systemBefore, systemBefore]);
  });
});

test.describe("The specimen's order", () => {
  test("follows the groups, so reordering them reorders the specimen", async ({
    seededPage: page,
  }) => {
    /* The groups reversed in storage, so their order cannot be the size
       order the specimen used to sort by. */
    const stored = await readStoredWorkspace(page);
    const system = stored.typography.system;
    system.groups = [...system.groups].reverse();
    await writeStoredWorkspace(page, stored);
    await page.reload();

    await page.getByRole("button", { name: "Specimen" }).click();
    const preview = page.getByRole("region", { name: "Type scale preview" });
    await expect(preview.locator("article h3").first()).toBeVisible();
    const shown = await preview.locator("article h3").allTextContents();

    /* Group by group, each group's roles in the order they are defined. */
    const expected = system.groups.flatMap((group: { id: string }) =>
      system.roles
        .filter((role: { groupId: string }) => role.groupId === group.id)
        .map((role: { id: string }) => role.id),
    );
    expect(shown).toEqual(expected);
    expect(shown.length).toBeGreaterThan(3);
  });
});

test.describe("A stack as chips", () => {
  test("shows each family as a chip that opens its picker", async ({
    seededPage: page,
  }) => {
    const settings = page.getByRole("region", { name: "Type scale settings" });
    const stack = settings.getByRole("region", { name: "Base stack" });

    /* No field labels on the card: a chip per family, in order. */
    await expect(stack.getByText("Base font", { exact: true })).toHaveCount(0);
    const primary = stack.getByRole("button", { name: /^Base font: / });
    await expect(primary).toBeVisible();

    /* A chip opens its slot's picker; choosing closes it and the chip
       says the new family. */
    await primary.click();
    const picker = page.getByRole("dialog", {
      name: "Choose a family for Base font",
    });
    await expect(picker).toBeVisible();
    await searchFont(settings, "Base font", "Lora");
    await page.getByRole("option", { name: "Lora", exact: true }).click();
    await expect(picker).toBeHidden();
    await expect(primary).toHaveAccessibleName("Base font: Lora");

    /* Add opens the new fallback's picker at once; picked, it is a chip
       with its own remove. */
    await stack.getByRole("button", { name: "Add a fallback to Base" }).click();
    await expect(
      page.getByRole("dialog", { name: "Choose a family for Base fallback 1" }),
    ).toBeVisible();
    await searchFont(settings, "Base fallback 1", "Sarabun");
    await page.getByRole("option", { name: "Sarabun" }).first().click();
    const fallback = stack.getByRole("button", {
      name: "Base fallback 1: Sarabun",
    });
    await expect(fallback).toBeVisible();

    await stack.getByRole("button", { name: "Remove Base fallback 1" }).click();
    await expect(fallback).toHaveCount(0);
    await expect.poll(() => storedFamilies(page)).not.toContain("Sarabun");
  });
});

test.describe("Fallbacks", () => {
  const addButton = (scope: Locator) =>
    scope.getByRole("button", { name: "Add a fallback to Base" });

  test("starts with none, and adds one row at a time", async ({
    seededPage: page,
  }) => {
    const settings = page.getByRole("region", { name: "Type scale settings" });

    await expect(
      settings.getByLabel("Base fallback 1", { exact: true }),
    ).toBeHidden();

    await addButton(settings).click();
    await expect(
      settings.getByLabel("Base fallback 1", { exact: true }),
    ).toBeVisible();
    await expect(
      settings.getByLabel("Base fallback 2", { exact: true }),
    ).toBeHidden();
  });

  test("stops at three, because the stack has three slots", async ({
    seededPage: page,
  }) => {
    const settings = page.getByRole("region", { name: "Type scale settings" });

    for (let row = 1; row <= 3; row += 1) {
      await addButton(settings).click();
      await expect(
        settings.getByLabel(`Base fallback ${row}`, { exact: true }),
      ).toBeVisible();
    }

    /* The button stays. A control that vanishes reads as a bug in the
       control; one that answers says no where the click was. */
    await expect(addButton(settings)).toBeVisible();
    await addButton(settings).click();
    /* The toast itself, not the live region that announces it — the same
       words are in the DOM twice by design. */
    await expect(
      page.getByLabel("Notifications").getByText(/A stack holds 3 fallbacks/),
    ).toBeVisible();

    /* And no fourth row came of it. */
    await expect(
      settings.getByLabel("Base fallback 4", { exact: true }),
    ).toHaveCount(0);
  });

  test("keeps the rows a stored stack has, across a reload", async ({
    seededPage: page,
  }) => {
    /* Reloaded rather than asserted straight after the picks: what brings the
       rows back is the stored stack, not the clicks that opened them. */
    const settings = page.getByRole("region", { name: "Type scale settings" });
    for (const [row, family] of [
      [1, "Sarabun"],
      [2, "Kanit"],
    ] as const) {
      await addButton(settings).click();
      await searchFont(settings, `Base fallback ${row}`, family);
      await page.getByRole("option", { name: family }).first().click();
    }

    await page.reload();
    const reloaded = page.getByRole("region", { name: "Type scale settings" });
    await expect(
      reloaded.getByRole("button", { name: "Sarabun" }),
    ).toBeVisible();
    await expect(reloaded.getByRole("button", { name: "Kanit" })).toBeVisible();
  });

  test("closes the gap when a fallback in front is removed", async ({
    seededPage: page,
  }) => {
    /* The families array is what the browser reads in order, so removing the
       first of two has to move the second up rather than leave a hole. */
    const settings = page.getByRole("region", { name: "Type scale settings" });
    for (const [row, family] of [
      [1, "Sarabun"],
      [2, "Kanit"],
    ] as const) {
      await addButton(settings).click();
      await searchFont(settings, `Base fallback ${row}`, family);
      await page.getByRole("option", { name: family }).first().click();
    }

    await settings
      .getByRole("button", { name: "Remove Base fallback 1" })
      .click();

    await expect
      .poll(() => storedFamilies(page))
      .toEqual(["Geist Sans", "Kanit", "ui-sans-serif", "system-ui"]);
    await expect(
      settings.getByRole("button", { name: "Sarabun" }),
    ).toBeHidden();
  });

  test("says when it cannot load the family, and nothing about coverage", async ({
    seededPage: page,
  }) => {
    /* The one note left. What Geist Sans covers is not ours to judge; that we
       cannot fetch it for this preview is a fact about this screen. */
    const settings = page.getByRole("region", { name: "Type scale settings" });

    await expect(settings.getByText(/is not a Google font/)).toBeHidden();
    await openSlot(settings, "Base font");
    await expect(settings.getByText(/is not a Google font/)).toBeVisible();
    await expect(settings.getByText(/glyph/i)).toHaveCount(0);
  });

  test("stops saying it once the family is one we can load", async ({
    seededPage: page,
  }) => {
    const settings = page.getByRole("region", { name: "Type scale settings" });
    await searchFont(settings, "Base font", "Sarabun");
    await page.getByRole("option", { name: "Sarabun" }).first().click();

    await openSlot(settings, "Base font");
    await expect(settings.getByText(/is not a Google font/)).toHaveCount(0);
  });
});

test.describe("Role presets", () => {
  test("switches the groups and roles, and marks a change as custom", async ({
    seededPage: page,
  }) => {
    await showInspectorPanel(page, "Groups");
    const presets = page.getByRole("toolbar", { name: "Role presets" });
    const chip = (name: string) => presets.getByRole("button", { name });
    const groups = async () =>
      (
        (await readStoredWorkspace(page)).typography.system.groups as {
          id: string;
        }[]
      ).map((group) => group.id);

    /* The seed is an older project, so it may start as Minimal or as
       Custom; from Custom, a preset asks first. */
    await chip("App UI").click();
    const confirm = page.getByRole("button", { name: "Use App UI" });
    if (await confirm.isVisible().catch(() => false)) await confirm.click();

    await expect(chip("App UI")).toHaveAttribute("aria-pressed", "true");
    await expect
      .poll(groups)
      .toEqual([
        "display",
        "h",
        "body",
        "button",
        "chip",
        "label",
        "caption",
        "code",
      ]);

    /* From a preset, the next one is instant: nothing of the author's is
       lost. */
    await chip("Editorial").click();
    await expect(chip("Editorial")).toHaveAttribute("aria-pressed", "true");
    await expect.poll(groups).toContain("overline");

    await chip("Minimal").click();
    await expect(chip("Minimal")).toHaveAttribute("aria-pressed", "true");
    await expect(presets.getByText("Custom")).toHaveCount(0);

    /* A change to any group makes it custom, and no chip is marked. */
    await page.getByRole("button", { name: "Add a role to Body" }).click();
    await expect(presets.getByText("Custom")).toBeVisible();
    await expect(chip("Minimal")).toHaveAttribute("aria-pressed", "false");
  });
});

test.describe("Reordering groups", () => {
  test.beforeEach(async ({ seededPage: page }) => {
    await showInspectorPanel(page, "Groups");
  });

  /** The group cards in the order the inspector renders them. */
  const order = (page: import("@playwright/test").Page) =>
    page
      .getByRole("region", { name: "Type scale settings" })
      .getByRole("group")
      .evaluateAll((cards) =>
        cards.map((card) => card.getAttribute("aria-label")),
      );

  const stored = async (page: import("@playwright/test").Page) => {
    const workspace = await readStoredWorkspace(page);
    return (workspace.typography.system.groups as { label: string }[]).map(
      (group) => group.label,
    );
  };

  /** What dnd-kit last announced, which is how a drag says where it is. */
  const announcement = (page: import("@playwright/test").Page) =>
    page.evaluate(
      () =>
        [...document.querySelectorAll("[role='status'],[aria-live]")]
          .map((node) => node.textContent?.trim())
          .filter(Boolean)
          .join(" | ") || null,
    );

  /*
   * Lift a card, and wait until an arrow key will actually be heard.
   *
   * Every observable sign of the lift arrives before the sensor can receive a
   * movement key, and this is dnd-kit's own arrangement rather than a guess.
   * `KeyboardSensor.attach()` calls `handleStart()` synchronously — which is
   * what turns `isDragging` on, and with it `aria-pressed` on the handle and
   * the "picked up" line in the live region — and then queues the keydown
   * listener itself in a `setTimeout`. The timer is what stops the Space that
   * began the drag from being re-read as a movement, so it is deliberate.
   *
   * Between those two there is a window where the card is fully, visibly
   * lifted and nothing is listening. An arrow pressed there is not mishandled,
   * it is dropped: no listener, no event. The card lifts and drops in the same
   * place, and the test reads exactly like a reorder that does not work.
   *
   * There is no DOM signal for "the listener is attached" — it happens in a
   * timer with no rendered effect. What is deterministic is the order of the
   * queue. dnd-kit queues its timer while handling the Space; a timer queued
   * after we have seen `aria-pressed` is therefore queued second, and timers
   * of equal delay fire in the order they were registered. Waiting for ours is
   * waiting for theirs to have run. That is an ordering guarantee, not a
   * duration: the wait is over the moment the queue reaches it, whether that
   * takes a microsecond or a second on a loaded machine.
   */
  const lift = async (
    page: import("@playwright/test").Page,
    handle: import("@playwright/test").Locator,
  ) => {
    await handle.focus();
    await page.keyboard.press("Space");
    await expect(handle).toHaveAttribute("aria-pressed", "true");
    await page.evaluate(
      () => new Promise<void>((resolve) => setTimeout(resolve)),
    );
  };

  /*
   * Lift a card, carry it one place down, drop it.
   *
   * Every step waits on the drag's own state rather than a sleep: the lift is
   * `aria-pressed` plus the queue turn above, the move is the live region
   * changing, and the drop is `aria-pressed` going away.
   */
  const carryDown = async (
    page: import("@playwright/test").Page,
    label: string,
  ) => {
    const handle = page
      .getByRole("region", { name: "Type scale settings" })
      .getByRole("button", { name: `Reorder ${label} group` });

    await lift(page, handle);

    const lifted = await announcement(page);
    await page.keyboard.press("ArrowDown");
    await expect.poll(() => announcement(page)).not.toBe(lifted);

    await page.keyboard.press("Space");
    await expect(handle).not.toHaveAttribute("aria-pressed", "true");
  };

  test("carries a group down the list from the keyboard", async ({
    seededPage: page,
  }) => {
    /* The keyboard path, not a simulated pointer drag. It is the one that has
       to work — the up and down buttons are gone, so this is the only way to
       reorder without a mouse, and a pointer drag in a test proves nothing
       about that. */
    const before = await order(page);
    expect(before.length).toBeGreaterThan(1);

    await carryDown(page, before[0]!);

    const expected = [before[1], before[0], ...before.slice(2)];
    await expect.poll(() => order(page)).toEqual(expected);
    /* And it is the model that moved, not just the cards on screen. */
    await expect.poll(() => stored(page)).toEqual(expected);
  });

  test("carries a card without stretching it to the one it passes", async ({
    seededPage: page,
  }) => {
    /* A group card is as tall as the roles it holds, so the list has uneven
       heights. dnd-kit's `CSS.Transform` is translate plus a scale measured
       against whatever is underneath, which grew a short card into the height
       of the tall one it was moving over. */
    const settings = page.getByRole("region", { name: "Type scale settings" });
    const heights = await settings.getByRole("group").evaluateAll((cards) =>
      cards.map((card) => ({
        label: card.getAttribute("aria-label"),
        height: Math.round(card.getBoundingClientRect().height),
      })),
    );

    const shortest = heights.reduce((a, b) => (a.height <= b.height ? a : b));
    const tallest = heights.reduce((a, b) => (a.height >= b.height ? a : b));
    /* The test only means something while the two differ. */
    expect(tallest.height).toBeGreaterThan(shortest.height);

    const handle = settings.getByRole("button", {
      name: `Reorder ${shortest.label} group`,
    });
    await lift(page, handle);
    const lifted = await announcement(page);
    await page.keyboard.press("ArrowDown");
    await expect.poll(() => announcement(page)).not.toBe(lifted);

    const dragged = settings.getByRole("group", {
      name: shortest.label!,
      exact: true,
    });
    await expect
      .poll(() =>
        dragged.evaluate((card) =>
          Math.round(card.getBoundingClientRect().height),
        ),
      )
      .toBe(shortest.height);
    /* And the scale itself, which is the thing that was wrong: a matrix whose
       vertical scale is not 1 is the card being resized rather than moved. */
    expect(
      await dragged.evaluate((card) => getComputedStyle(card).transform),
    ).toMatch(/^matrix\(1, 0, 0, 1, /);

    await page.keyboard.press("Escape");
  });

  test("keeps the new order across a reload", async ({ seededPage: page }) => {
    const before = await order(page);
    await carryDown(page, before[0]!);

    const expected = [before[1], before[0], ...before.slice(2)];
    await expect.poll(() => stored(page)).toEqual(expected);

    await page.reload();
    await expect(
      page.getByRole("region", { name: "Type scale settings" }),
    ).toBeVisible();
    /* A reload opens the inspector on its first panel, so the groups have to
       be asked for again. */
    await showInspectorPanel(page, "Groups");
    await expect.poll(() => order(page)).toEqual(expected);
  });
});
