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

  test("shows step sizes in the chosen unit", async ({ seededPage: page }) => {
    const steps = page.getByRole("region", { name: "Generated type steps" });
    await expect(steps.getByText("1rem", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Export type scale" }).click();
    await page.getByRole("button", { name: "px", exact: true }).click();
    await page.getByRole("button", { name: "Close export" }).click();

    await expect(steps.getByText("16px", { exact: true })).toBeVisible();
    await expect(steps.getByText("1rem", { exact: true })).toBeHidden();
  });

  test("renders the specimen text at every step", async ({
    seededPage: page,
  }) => {
    await page.getByLabel("Specimen text").fill("Test ไฟหกฟ");

    const samples = page
      .getByRole("region", { name: "Generated type steps" })
      .getByText("Test ไฟหกฟ");
    expect(await samples.count()).toBeGreaterThan(1);
    await expect(samples.first()).toBeVisible();
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
    await expect(settings.getByRole("heading", { name: "Body" })).toBeVisible();
    await expect(settings.getByLabel("Base font stack")).toHaveValue(
      /Geist Sans/,
    );
  });

  test("groups roles and adds one to a group", async ({ seededPage: page }) => {
    const settings = page.getByRole("region", { name: "Type scale settings" });

    for (const group of ["Display", "Heading", "Body", "Label", "Caption"]) {
      await expect(
        settings.getByRole("heading", { name: group, exact: true }),
      ).toBeVisible();
    }

    const before = await settings.getByLabel(/ element$/).count();
    await settings
      .getByRole("heading", { name: "Body", exact: true })
      .locator("..")
      .getByRole("button", { name: "Add" })
      .click();

    expect(await settings.getByLabel(/ element$/).count()).toBe(before + 1);
  });

  test("removes a role", async ({ seededPage: page }) => {
    const settings = page.getByRole("region", { name: "Type scale settings" });
    const before = await settings.getByLabel(/ element$/).count();

    // exact, or this also matches the group's own "Remove Caption group".
    await settings
      .getByRole("button", { name: "Remove caption", exact: true })
      .click();

    expect(await settings.getByLabel(/ element$/).count()).toBe(before - 1);
    await expect(
      settings.getByRole("button", { name: "Remove caption", exact: true }),
    ).toBeHidden();
  });

  test("changes the element a role renders as", async ({
    seededPage: page,
  }) => {
    const settings = page.getByRole("region", { name: "Type scale settings" });
    // Astryx Selector is a listbox, not a native select.
    await settings.getByLabel("body element").click();
    await page.getByRole("option", { name: "h4", exact: true }).click();

    await page.getByRole("button", { name: "Preview", exact: true }).click();
    await expect(
      page
        .getByRole("region", { name: "Type scale preview" })
        .getByRole("heading", { level: 4 })
        .first(),
    ).toBeVisible();
  });

  test("heading offers no element picker, because h1-h6 is derived", async ({
    seededPage: page,
  }) => {
    const settings = page.getByRole("region", { name: "Type scale settings" });
    // body is a free-form role, so it keeps the control.
    await expect(settings.getByLabel("body element")).toBeVisible();
    // heading roles derive their element from position.
    await expect(settings.getByLabel("heading element")).toBeHidden();
  });

  test("adds a group, renames it, and moves it", async ({
    seededPage: page,
  }) => {
    const settings = page.getByRole("region", { name: "Type scale settings" });
    await settings.getByRole("button", { name: "Add group" }).click();

    const nameField = settings.getByLabel(/^Group \d+ name$/);
    await expect(nameField).toBeVisible();
    await nameField.fill("Overline");

    await expect(
      settings.getByRole("heading", { name: "Overline" }),
    ).toBeVisible();
    await expect(
      settings.getByRole("button", { name: "Move Overline up" }),
    ).toBeVisible();
  });

  test("fixed groups cannot be removed or reordered", async ({
    seededPage: page,
  }) => {
    const settings = page.getByRole("region", { name: "Type scale settings" });
    await expect(
      settings.getByRole("button", { name: "Remove Heading group" }),
    ).toBeHidden();
    await expect(
      settings.getByRole("button", { name: "Move Body up" }),
    ).toBeHidden();
  });

  test("a new role follows body instead of taking its own step", async ({
    seededPage: page,
  }) => {
    // Adding roles must never force the size ramp to grow: most component
    // styles are body with a small adjustment.
    const settings = page.getByRole("region", { name: "Type scale settings" });
    await settings
      .getByRole("heading", { name: "Body", exact: true })
      .locator("..")
      .getByRole("button", { name: "Add" })
      .click();

    /* Two body roles now, so they are reindexed to body-1 and body-2. The new
       one follows the first rather than claiming a step. */
    await expect(settings.getByLabel("body-2 size")).toContainText(
      "Same as body-1",
    );
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
    await expect(settings.getByRole("heading", { name: "Body" })).toBeVisible();
    await expect(settings.getByLabel("body font weight")).toHaveValue("400");
    await expect(page.getByLabel("Project name")).toHaveValue("Saved earlier");
  });
});
