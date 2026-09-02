import { expect, showInspectorPanel, test } from "./typography-fixtures";
import type { Locator } from "@playwright/test";

/**
 * Type a query into a font picker.
 *
 * Astryx collapses the Typeahead's input to zero width while a value token is
 * shown, so a picker that already holds a font cannot be filled directly.
 * Clearing the token is what the widget offers to get back to an editable
 * field, and it is what a person does too.
 */
async function searchFont(scope: Locator, label: string, query: string) {
  const input = scope.getByLabel(label, { exact: true });
  if (!(await input.isVisible())) {
    await input
      .locator("xpath=..")
      .getByRole("button", { name: "Clear selection" })
      .click();
  }
  await input.fill(query);
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
const storedFamilies = (page: import("@playwright/test").Page) =>
  page.evaluate(() => {
    const raw = window.localStorage.getItem("blueprint.workspace.v1");
    return JSON.parse(raw!).typography.system.fonts[0].families as string[];
  });

const labelInfo = (scope: Locator, label: string) =>
  scope
    .locator("label", { hasText: new RegExp(`^${label}$`) })
    .locator("svg")
    .first();

test.describe("Typography scale editing", () => {
  test("switches between Editor and Preview sections", async ({
    seededPage: page,
  }) => {
    await expect(
      page.getByRole("region", { name: "Generated type steps" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Preview", exact: true }).click();
    await expect(
      page.getByRole("region", { name: "Type scale preview" }),
    ).toBeVisible();
    await expect(page.getByText("Design with clarity")).toBeVisible();

    await page.getByRole("button", { name: "Editor" }).click();
    await expect(
      page.getByRole("region", { name: "Generated type steps" }),
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
    await page.getByLabel("Scale ratio").click();
    await page.getByRole("option", { name: /Golden Ratio/ }).click();

    /* The ratio is on Settings and what it raises is a panel over, which is
       the point of the count on the tab: the warning is somewhere else. */
    await expect(page.getByRole("tab", { name: /^Warnings/ })).toContainText(
      "1",
    );
    await showInspectorPanel(page, "Warnings");
    await expect(page.getByText(/grows quickly/i)).toBeVisible();
  });

  test("switches preview templates and languages", async ({
    seededPage: page,
  }) => {
    await page.getByRole("button", { name: "Preview", exact: true }).click();
    const preview = page.getByRole("region", { name: "Type scale preview" });

    // Specimen is the default and lists every role.
    await expect(
      preview.getByRole("heading", { name: "display" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Article" }).click();
    await expect(
      preview.getByRole("heading", {
        name: "A type scale is a set of decisions, not a set of sizes",
        level: 1,
      }),
    ).toBeVisible();

    // Exactly one h1: the mapping puts only `display` at the top level.
    expect(await preview.getByRole("heading", { level: 1 }).count()).toBe(1);

    await page.getByRole("button", { name: "ไทย" }).click();
    await expect(preview.getByRole("heading", { level: 1 })).toContainText(
      "สเกลตัวอักษร",
    );

    await page.getByRole("button", { name: "Marketing page" }).click();
    await expect(preview.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("keeps the chosen template after a reload", async ({
    seededPage: page,
  }) => {
    await page.getByRole("button", { name: "Preview", exact: true }).click();
    await page.getByRole("button", { name: "Article" }).click();

    await page.reload();
    await page.getByRole("button", { name: "Preview", exact: true }).click();

    await expect(
      page
        .getByRole("region", { name: "Type scale preview" })
        .getByRole("heading", { level: 1 }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Article" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
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
    /* The note moved into the label's info icon. It is a standing fact about
       the family rather than something to act on, so it is only read by
       somebody who asks for it. */
    await expect(settings.getByText(/is not a Google font/)).toBeHidden();
    await labelInfo(settings, "Base font").hover();
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
    await page.getByRole("button", { name: "Preview", exact: true }).click();
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
    await expect(settings.getByLabel("body-1 size")).toHaveValue(
      await settings.getByLabel("body-2 size").inputValue(),
    );
  });

  test("a size can be typed, which unlinks it from the ramp", async ({
    seededPage: page,
  }) => {
    await showInspectorPanel(page, "Groups");
    const settings = page.getByRole("region", { name: "Type scale settings" });

    // 14 is not on the default ramp, so this is only reachable by typing.
    await settings.getByLabel("body size").fill("14");
    await settings.getByLabel("body size").blur();

    await expect(settings.getByLabel("body size")).toHaveValue("14");
    await expect(settings.getByLabel("body step")).toContainText("Custom");
  });

  test("picking a step relinks the size to the ramp", async ({
    seededPage: page,
  }) => {
    await showInspectorPanel(page, "Groups");
    const settings = page.getByRole("region", { name: "Type scale settings" });
    await settings.getByLabel("body size").fill("14");
    await settings.getByLabel("body size").blur();

    await settings.getByLabel("body step").click();
    await page.getByRole("option", { name: /^\+1 / }).click();

    await expect(settings.getByLabel("body step")).not.toContainText("Custom");
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
    await settings.getByLabel("body step").click();

    const options = page.getByRole("option");
    // Custom heads the list; the steps under it run high to low, matching the
    // step list on the left.
    expect(await options.first().textContent()).toContain("Custom");
    expect(await options.nth(1).textContent()).toContain("+");
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
       readable one, because a blog still needs a legible h1. */
    await page.goto("/typography");
    await page.getByLabel("Project name").fill("Pairing");
    await page.getByRole("button", { name: "Create type scale" }).click();

    const settings = page.getByRole("region", { name: "Type scale settings" });
    await showInspectorPanel(page, "Groups");
    await expect(
      settings.getByRole("group", { name: "Display" }),
    ).toBeVisible();
    await expect(
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

test.describe("Reopening a font picker", () => {
  /*
   * Astryx's Typeahead opens on focus alone, and its dropdown is a native
   * popover that light-dismisses on any outside pointer click — the field
   * included. Left alone, a second click on an already-focused picker closes
   * the menu with nothing able to reopen it, and you have to leave the field
   * and come back. `GoogleFontPicker` restores the click.
   */
  test("opens again when the focused field is clicked", async ({
    seededPage: page,
  }) => {
    const settings = page.getByRole("region", { name: "Type scale settings" });
    await openFallback(settings);
    // The bilingual fallback starts empty, so the input itself is what is hit.
    const input = settings.getByLabel("Base fallback 1", {
      exact: true,
    });

    await input.click();
    await expect(page.getByRole("option").first()).toBeVisible();

    // The click that used to close the menu and leave it closed.
    await input.click();
    await expect(page.getByRole("option").first()).toBeVisible();

    await input.click();
    await expect(page.getByRole("option").first()).toBeVisible();
  });

  test("still closes on Escape and on a click outside", async ({
    seededPage: page,
  }) => {
    const settings = page.getByRole("region", { name: "Type scale settings" });
    await openFallback(settings);
    const input = settings.getByLabel("Base fallback 1", {
      exact: true,
    });

    await input.click();
    await expect(page.getByRole("option").first()).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("option")).toHaveCount(0);

    /* Reopened rather than assumed: dismissing must not be what stops the
       click above from working. */
    await input.click();
    await expect(page.getByRole("option").first()).toBeVisible();
    await settings.getByRole("heading", { name: "Scale" }).click();
    await expect(page.getByRole("option")).toHaveCount(0);
  });
});

test.describe("Where a Selector menu opens", () => {
  /*
   * Astryx places its popovers twice — CSS anchor positioning and a
   * JS-measured margin meant as a fallback for browsers without it. Where a
   * browser has both, the margin moves a menu that anchor positioning has
   * already placed, and the script picker opened at the top of the window
   * instead of against its trigger. globals.css neutralises the margin where
   * anchor positioning works; this is what says so.
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

    /* Adjacent on one side or the other: under the trigger normally, over it
       where there is no room below. Which one is the browser's call, and not
       what this is pinning down. */
    const below = Math.abs(menu!.top - (anchor.y + anchor.height));
    const above = Math.abs(menu!.bottom - anchor.y);
    /* 32px rather than a tighter figure: the gap is a spacing token plus the
       popover's own border, and it differs between opening below and flipping
       above. Broken, this distance was the height of the menu. */
    expect(Math.min(below, above)).toBeLessThan(32);

    // And on screen, which is what the bug most visibly broke.
    expect(menu!.top).toBeGreaterThanOrEqual(0);
    expect(menu!.bottom).toBeLessThanOrEqual(menu!.viewportHeight + 1);
  };

  test("sits against its trigger rather than the top of the window", async ({
    seededPage: page,
  }) => {
    const settings = page.getByRole("region", { name: "Type scale settings" });
    /* The ratio Selector, which sits low enough in the inspector that the
       menu flips above its trigger — the case the override is about. The
       script Selector this used to open no longer exists. */
    const trigger = settings.getByLabel("Scale ratio", { exact: true });

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
    /* The ratio Selector, which sits low enough in the inspector that the
       menu flips above its trigger — the case the override is about. The
       script Selector this used to open no longer exists. */
    const trigger = settings.getByLabel("Scale ratio", { exact: true });
    await trigger.scrollIntoViewIfNeeded();

    /* Twice, because the first open was the worst of it: the menu had not been
       laid out, so the margin was measured against a height it did not have. */
    for (let open = 1; open <= 2; open += 1) {
      await trigger.click();
      await expect(page.getByRole("option").first()).toBeVisible();
      await expectAgainstTrigger(page, trigger);
      await page.keyboard.press("Escape");
      await expect(page.getByRole("option")).toHaveCount(0);
    }
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
    await labelInfo(settings, "Base font").hover();
    await expect(settings.getByText(/is not a Google font/)).toBeVisible();
    await expect(settings.getByText(/glyph/i)).toHaveCount(0);
  });

  test("stops saying it once the family is one we can load", async ({
    seededPage: page,
  }) => {
    const settings = page.getByRole("region", { name: "Type scale settings" });
    await searchFont(settings, "Base font", "Sarabun");
    await page.getByRole("option", { name: "Sarabun" }).first().click();

    await expect(
      settings.locator("label", { hasText: /^Base font$/ }).locator("svg"),
    ).toHaveCount(0);
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

  const stored = (page: import("@playwright/test").Page) =>
    page.evaluate(() => {
      const raw = window.localStorage.getItem("blueprint.workspace.v1");
      return (
        JSON.parse(raw!).typography.system.groups as { label: string }[]
      ).map((group) => group.label);
    });

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
   * Lift a card, carry it one place down, drop it.
   *
   * Every step waits on the drag's own state rather than a sleep. The lift is
   * `aria-pressed` on the handle, which is dnd-kit saying it has the card;
   * the announcement is not enough on its own, because it updates before the
   * sensor is ready and an arrow pressed on that signal is swallowed. Three
   * presses in a row lift and drop in the same place, which reads exactly
   * like a reorder that does not work.
   */
  const carryDown = async (
    page: import("@playwright/test").Page,
    label: string,
  ) => {
    const handle = page
      .getByRole("region", { name: "Type scale settings" })
      .getByRole("button", { name: `Reorder ${label} group` });

    await handle.focus();
    await page.keyboard.press("Space");
    await expect(handle).toHaveAttribute("aria-pressed", "true");

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
    await handle.focus();
    await page.keyboard.press("Space");
    await expect(handle).toHaveAttribute("aria-pressed", "true");
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
