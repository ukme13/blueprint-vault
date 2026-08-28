import { expect, test } from "./typography-fixtures";

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
    await expect(settings.getByRole("group", { name: "Body" })).toBeVisible();
    await expect(
      settings.getByText(/^Stack: Geist Sans/).first(),
    ).toBeVisible();
  });

  test("groups roles and adds one to a group", async ({ seededPage: page }) => {
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

    expect(await settings.getByLabel(/ font weight$/).count()).toBe(before + 1);
  });

  test("removes a role", async ({ seededPage: page }) => {
    const settings = page.getByRole("region", { name: "Type scale settings" });
    const before = await settings.getByLabel(/ font weight$/).count();

    // exact, or this also matches the group's own "Remove Caption group".
    await settings
      .getByRole("button", { name: "Remove caption", exact: true })
      .click();

    expect(await settings.getByLabel(/ font weight$/).count()).toBe(before - 1);
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
    const settings = page.getByRole("region", { name: "Type scale settings" });
    await settings.getByRole("button", { name: "Add group" }).click();

    const nameField = settings.getByLabel(/^group-\d+ name$/);
    await expect(nameField).toBeVisible();
    await nameField.fill("Overline");

    await expect(
      settings.getByRole("group", { name: "Overline" }),
    ).toBeVisible();
    await expect(
      settings.getByRole("button", { name: "Move Overline up" }),
    ).toBeVisible();
  });

  test("every group can be renamed, moved and removed", async ({
    seededPage: page,
  }) => {
    // H and Body are only defaults now, not locked.
    const settings = page.getByRole("region", { name: "Type scale settings" });
    for (const group of ["H", "Body"]) {
      await expect(
        settings.getByLabel(`${group.toLowerCase()} name`),
      ).toBeVisible();
      await expect(
        settings.getByRole("button", { name: `Move ${group} up` }),
      ).toBeVisible();
      await expect(
        settings.getByRole("button", { name: `Remove ${group} group` }),
      ).toBeVisible();
    }
  });

  test("a group named h numbers its roles without a dash", async ({
    seededPage: page,
  }) => {
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
    await expect(settings.getByRole("group", { name: "Body" })).toBeVisible();
    await expect(settings.getByLabel("body font weight")).toHaveValue("400");
    await expect(page.getByLabel("Project name")).toHaveValue("Saved earlier");
  });

  test("renaming a group renames its roles", async ({ seededPage: page }) => {
    const settings = page.getByRole("region", { name: "Type scale settings" });
    await settings.getByLabel("caption name").fill("Overline");
    await settings.getByLabel("caption name").blur();

    await expect(
      settings.getByRole("button", { name: "Remove overline", exact: true }),
    ).toBeVisible();
  });

  test("applies a group rename on Enter", async ({ seededPage: page }) => {
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
    await settings.getByLabel("Base font", { exact: true }).fill("Sarabun");
    await page.getByRole("option", { name: "Sarabun" }).first().click();

    // The stack is rebuilt with the generic appended.
    await expect(settings.getByText(/^Stack: Sarabun/).first()).toBeVisible();

    /* next/font cannot load a runtime choice, so the studio injects the
       stylesheet itself. */
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            document.querySelectorAll('link[href*="fonts.googleapis.com/css2"]')
              .length,
        ),
      )
      .toBeGreaterThan(0);
  });

  test("warns when a chosen family has no Thai glyphs", async ({
    seededPage: page,
  }) => {
    const settings = page.getByRole("region", { name: "Type scale settings" });
    await settings.getByLabel("Base font", { exact: true }).fill("Inter");
    await page.getByRole("option", { name: "Inter" }).first().click();

    // Otherwise Thai silently falls back to a system font.
    await expect(settings.getByText(/no Thai glyphs/).first()).toBeVisible();
  });

  test("a new scale ships a Display group and two fonts", async ({ page }) => {
    /* Display is the expressive brand face used big; headings and body use the
       readable one, because a blog still needs a legible h1. */
    await page.goto("/typography");
    await page.getByLabel("Project name").fill("Pairing");
    await page.getByRole("button", { name: "Create type scale" }).click();

    const settings = page.getByRole("region", { name: "Type scale settings" });
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

  test("offers a bilingual fallback filtered by script", async ({
    seededPage: page,
  }) => {
    const settings = page.getByRole("region", { name: "Type scale settings" });
    const fallback = settings.getByLabel("Base bilingual fallback");

    await fallback.click();
    // Thai is the default script, so every option covers it.
    await expect(page.getByRole("option", { name: "Sarabun" })).toBeVisible();
  });

  test("loads the bilingual fallback, not only the primary", async ({
    seededPage: page,
  }) => {
    /* A fallback that is never downloaded cannot be fallen back to: the browser
       skips it and lands on the generic, which reads as the fallback being
       ignored. */
    const settings = page.getByRole("region", { name: "Type scale settings" });

    await settings.getByLabel("Base font", { exact: true }).fill("Orbitron");
    await page.getByRole("option", { name: "Orbitron" }).first().click();
    await settings.getByLabel("Base bilingual fallback").fill("Kanit");
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

    // The name is what the role dropdown offers.
    await settings.getByLabel("h1 font", { exact: true }).click();
    await expect(page.getByRole("option", { name: "Display" })).toBeVisible();
  });

  test("moves roles off a font entry that is removed", async ({
    seededPage: page,
  }) => {
    const settings = page.getByRole("region", { name: "Type scale settings" });
    await settings.getByRole("button", { name: "Add font" }).click();
    await settings.getByLabel("font-2 name").fill("Display");

    await settings.getByLabel("h1 font", { exact: true }).click();
    await page.getByRole("option", { name: "Display" }).click();

    await settings.getByRole("button", { name: "Remove Display font" }).click();

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
});
