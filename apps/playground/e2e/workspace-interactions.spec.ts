import { defaultProject, expect, readStoredWorkspace, test } from "./fixtures";

test.describe("Shade details", () => {
  test("keeps editing the source when a new lightness moves it", async ({
    seededPage: page,
  }) => {
    /* A darker or lighter seed moves the source to another weight. The
       popover stays on the weight it opened on, and its next pick once
       landed there as a manual override, with Manual and Reset beside it. */
    const source = page
      .getByRole("button", { name: /^Select secondary / })
      .filter({ has: page.getByLabel("Source colour") });
    const label = await source.getAttribute("aria-label");
    const weight = /^Select secondary (\d+),/.exec(label!)![1]!;
    await source.click();
    const details = page.getByRole("dialog", {
      name: `secondary ${weight} shade details`,
    });
    /* Two picks, the picker reopened between them: the first moves the
       source off this weight, the second is the one that went astray. */
    for (const hex of ["#17dfcc", "#12c9b7"]) {
      await details
        .getByRole("button", { name: `Edit secondary ${weight} colour` })
        .click();
      // Still the source, on the weight it opened on.
      const field = page.getByLabel(
        `secondary ${weight} source shade colour HEX value`,
      );
      await field.fill(hex);
      await field.press("Enter");
      await expect(field).toBeHidden();
    }

    await expect(
      details.getByRole("region", { name: "Shade edit controls" }),
    ).toHaveCount(0);
    await expect(
      page
        .getByRole("button", { name: /^Select secondary / })
        .getByLabel("Manual colour"),
    ).toHaveCount(0);
    await expect
      .poll(async () => {
        const stored = await readStoredWorkspace(page);
        const track = stored?.palette?.tracks.find(
          (each: { id: string }) => each.id === "secondary",
        );
        return {
          seed: track?.seedHex.toLowerCase(),
          manual: Object.keys(track?.adjustments?.manualOverrides ?? {}),
        };
      })
      .toEqual({ seed: "#12c9b7", manual: [] });
  });

  test("swaps the contrast sample, and sets the grades in the text face", async ({
    seededPage: page,
  }) => {
    await page
      .getByRole("button", { name: /Select primary 500,/ })
      .first()
      .click();
    const contrast = page
      .getByRole("dialog", { name: "primary 500 shade details" })
      .getByRole("region", { name: "WCAG 2 contrast result" });
    await expect(contrast).toBeVisible();

    /* The shade as text on the comparison colour; swapped, the comparison
       colour as text on the shade. The ratio is the same either way. */
    const sample = contrast.locator("span[aria-hidden]").first();
    const swap = contrast.getByRole("button", {
      name: "Swap text and background",
    });
    const paint = () =>
      sample.evaluate((node) => {
        const css = getComputedStyle(node);
        return { ground: css.backgroundColor, ink: css.color };
      });
    const ratio = await contrast.locator("strong").textContent();
    const before = await paint();
    await expect(swap).toHaveAttribute("aria-pressed", "false");
    // The caption says which way round the sample is.
    const caption = contrast.locator("header small");
    await expect(caption).toHaveText("Shade on White");
    const width = () =>
      contrast.evaluate(
        (section) =>
          section.closest(".astryx-popover")!.getBoundingClientRect().width,
      );
    const openWidth = await width();
    expect(Math.round(openWidth)).toBe(300);

    await swap.click();
    await expect(swap).toHaveAttribute("aria-pressed", "true");
    await expect(caption).toHaveText("White on Shade");
    // Not a pixel wider or narrower for the swap.
    expect(await width()).toBe(openWidth);
    await expect
      .poll(paint)
      .toEqual({ ground: before.ink, ink: before.ground });
    await expect(contrast.locator("strong")).toHaveText(ratio!);

    await swap.click();
    await expect.poll(paint).toEqual(before);
    await expect(caption).toHaveText("Shade on White");
    expect(await width()).toBe(openWidth);

    /* The popover has no padding of its own: its dividers meet both edges. */
    const edges = await contrast.evaluate((section) => {
      const popover = section.closest(".astryx-popover")!;
      const box = popover.getBoundingClientRect();
      const border = parseFloat(getComputedStyle(popover).borderLeftWidth);
      const row = popover.querySelector("header")!.getBoundingClientRect();
      return [
        Math.round(row.left - box.left - border),
        Math.round(box.right - border - row.right),
      ];
    });
    expect(edges).toEqual([0, 0]);

    /* The grades in the popover's own sans, not mono; the caption legible;
       the sample's edge the subtle border, not the strong one. */
    const type = await contrast.evaluate((section) => {
      const grade = getComputedStyle(section.querySelector("dd")!);
      const probe = document.createElement("i");
      probe.style.borderTop = "1px solid var(--color-border-subtle)";
      section.append(probe);
      const subtle = getComputedStyle(probe).borderTopColor;
      probe.remove();
      return {
        gradeFace: grade.fontFamily === getComputedStyle(section).fontFamily,
        gradeSize: grade.fontSize,
        gradeWeight: grade.fontWeight,
        caption: getComputedStyle(section.querySelector("small")!).fontSize,
        edgeIsSubtle:
          getComputedStyle(section.querySelector("span[aria-hidden]")!)
            .borderTopColor === subtle,
      };
    });
    expect(type).toEqual({
      gradeFace: true,
      gradeSize: "12px",
      gradeWeight: "600",
      caption: "11px",
      edgeIsSubtle: true,
    });
  });

  test("opens, copies the OKLCH value, and returns focus when closed", async ({
    seededPage: page,
  }) => {
    await page
      .context()
      .grantPermissions(["clipboard-read", "clipboard-write"]);

    const shade = page.getByRole("button", {
      name: /Select primary 500,/,
    });
    const contrastRatios = page.locator("button[data-contrast-ratio]");
    await expect(contrastRatios).toHaveCount(0);

    const contrastMode = page.getByRole("button", {
      name: "Contrast",
      exact: true,
    });
    await contrastMode.hover();
    await expect(
      page.getByText(
        "Below 3:1 fails. Normal text needs 4.5:1 for AA and 7:1 for AAA.",
        { exact: true },
      ),
    ).toBeVisible();
    await contrastMode.click();
    /* Contrast names the group and is never lit; the standard in use is. */
    await expect(contrastMode).not.toHaveAttribute("aria-pressed");
    await expect(
      page.getByRole("button", { name: "WCAG 2", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(contrastRatios).toHaveCount(140);

    const ratioAgainstWhite = await shade.getAttribute("data-contrast-ratio");
    expect(ratioAgainstWhite).not.toBe("1.0");

    const comparisonOptions = page.getByRole("region", {
      name: "Contrast comparison",
    });

    await comparisonOptions.getByRole("radio", { name: "Black" }).click();
    await expect(shade).not.toHaveAttribute(
      "data-contrast-ratio",
      ratioAgainstWhite!,
    );

    await comparisonOptions.getByRole("radio", { name: "Custom" }).click();
    await expect(
      page.getByRole("button", { name: "Choose custom contrast colour" }),
    ).toBeVisible();

    const ratioAgainstCustom = await shade.getAttribute("data-contrast-ratio");

    await shade.click();
    await expect(shade).toHaveAttribute(
      "data-contrast-ratio",
      ratioAgainstCustom!,
    );

    const details = page.getByRole("dialog", {
      name: "primary 500 shade details",
    });
    const formatSelector = details.getByLabel("Shade colour format");
    await expect(formatSelector).toContainText("HEX");
    const selectorBackground = await formatSelector.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    );
    await formatSelector.hover();
    await expect
      .poll(() =>
        formatSelector.evaluate(
          (element) => getComputedStyle(element).backgroundColor,
        ),
      )
      .toBe(selectorBackground);
    await expect(
      details.getByRole("button", { name: "Copy HEX value" }),
    ).toContainText(/^#[0-9A-F]{6}$/);

    await formatSelector.click();
    await page.getByRole("option", { name: "OKLCH", exact: true }).click();
    await expect(formatSelector).toContainText("OKLCH");
    await expect(
      details.getByRole("button", { name: "Copy OKLCH value" }),
    ).toContainText("oklch(");
    await expect(
      details.getByRole("region", { name: "WCAG 2 contrast result" }),
    ).toContainText("Shade on Custom");
    await expect(
      details.getByText("Large text", { exact: true }),
    ).toBeVisible();
    await expect(
      details.getByText("Small text", { exact: true }),
    ).toBeVisible();
    await expect(details.getByText("Graphics", { exact: true })).toBeVisible();

    const copyButton = details.getByRole("button", {
      name: "Copy OKLCH value",
    });
    await copyButton.click();
    await expect(copyButton).toContainText("oklch(");
    // Scoped to the notifications region: since Astryx 0.5.0 a toast also
    // announces itself through a separate aria-live region carrying the same
    // text, so an unscoped getByText matches two elements.
    await expect(
      page.getByLabel("Notifications").getByText("Color copied", {
        exact: true,
      }),
    ).toBeVisible();

    await details.getByRole("button", { name: "Close shade details" }).click();
    await expect(details).toBeHidden();
    await expect(shade).toBeFocused();

    await contrastMode.click();
    /* Off, only Contrast is left in the group. */
    await expect(
      page.getByRole("button", { name: "WCAG 2", exact: true }),
    ).toHaveCount(0);
    await expect(contrastRatios).toHaveCount(0);

    await page.reload();
    await shade.click();
    await expect(
      page
        .getByRole("dialog", { name: "primary 500 shade details" })
        .getByLabel("Shade colour format"),
    ).toContainText("OKLCH");
  });

  test("types a HEX through its shorthand without it being filled in early", async ({
    seededPage: page,
  }) => {
    await page.getByRole("button", { name: /Select primary 200,/ }).click();
    await page
      .getByRole("dialog", { name: "primary 200 shade details" })
      .getByRole("button", { name: "Edit primary 200 colour" })
      .click();
    const picker = page.getByRole("dialog", {
      name: "primary 200 manual colour picker",
    });
    const hexInput = picker.getByLabel("primary 200 manual colour HEX value");

    /* #111 is a valid shorthand, but a person typing #111000 is not done: it
       stays as typed and the next digits land after it. */
    await hexInput.fill("");
    await hexInput.pressSequentially("#111");
    await expect(hexInput).toHaveValue("#111");
    await hexInput.pressSequentially("000");
    await expect(hexInput).toHaveValue("#111000");

    /* Shorthand is still welcome, once finished. */
    await hexInput.fill("#abc");
    await expect(hexInput).toHaveValue("#abc");
    await hexInput.press("Enter");
    await expect(picker).toBeHidden();
    await page
      .getByRole("dialog", { name: "primary 200 shade details" })
      .getByRole("button", { name: "Edit primary 200 colour" })
      .click();
    await expect(
      page
        .getByRole("dialog", { name: "primary 200 manual colour picker" })
        .getByLabel("primary 200 manual colour HEX value"),
    ).toHaveValue("#AABBCC");
  });

  test("manually edits a shade, promotes it to an anchor, and resets it", async ({
    seededPage: page,
  }) => {
    const anchorShade = page.getByRole("button", {
      name: /Select primary 200,/,
    });
    const blendedShade = page.getByRole("button", {
      name: /Select primary 350,/,
    });
    const leadingShade = page.getByRole("button", {
      name: /Select primary 150,/,
    });
    const originalBlend = await blendedShade.getAttribute("style");
    const originalLeadingShade = await leadingShade.getAttribute("style");
    const originalAnchorShade = await anchorShade.getAttribute("style");

    await anchorShade.click();
    let details = page.getByRole("dialog", {
      name: "primary 200 shade details",
    });
    await details
      .getByRole("button", { name: "Edit primary 200 colour" })
      .click();
    const picker = page.getByRole("dialog", {
      name: "primary 200 manual colour picker",
    });
    const hexInput = picker.getByLabel("primary 200 manual colour HEX value");
    await hexInput.fill("#d8c65a");
    await hexInput.press("Enter");

    await expect(details.getByRole("radio", { name: "Manual" })).toBeChecked();
    await expect(anchorShade.getByLabel("Manual colour")).toBeVisible();
    await expect(anchorShade).not.toHaveAttribute(
      "style",
      originalAnchorShade!,
    );
    await expect(blendedShade).toHaveAttribute("style", originalBlend!);
    await expect(leadingShade).toHaveAttribute("style", originalLeadingShade!);

    await details.getByRole("button", { name: "Close shade details" }).click();
    await page.reload();
    await anchorShade.click();
    details = page.getByRole("dialog", {
      name: "primary 200 shade details",
    });
    await expect(details.getByRole("radio", { name: "Manual" })).toBeChecked();
    await details.getByRole("radio", { name: "Anchor" }).click();

    await expect(anchorShade.getByLabel("Colour anchor")).toBeVisible();
    await expect(anchorShade.getByLabel("Manual colour")).toHaveCount(0);
    await expect(blendedShade).not.toHaveAttribute("style", originalBlend!);
    await expect(leadingShade).not.toHaveAttribute(
      "style",
      originalLeadingShade!,
    );

    await details.getByRole("button", { name: "Close shade details" }).click();
    await page.reload();
    await anchorShade.click();
    details = page.getByRole("dialog", {
      name: "primary 200 shade details",
    });
    await expect(details.getByRole("radio", { name: "Anchor" })).toBeChecked();

    await details.getByRole("button", { name: "Reset", exact: true }).click();
    await expect(anchorShade.getByLabel("Colour anchor")).toHaveCount(0);
    await expect(
      details.getByRole("region", { name: "Shade edit controls" }),
    ).toHaveCount(0);
  });

  test("resets every custom shade change in one track", async ({
    seededPage: page,
  }) => {
    const anchorShade = page.getByRole("button", {
      name: /Select primary 200,/,
    });
    const manualShade = page.getByRole("button", {
      name: /Select primary 350,/,
    });

    await anchorShade.click();
    let details = page.getByRole("dialog", {
      name: "primary 200 shade details",
    });
    await details
      .getByRole("button", { name: "Edit primary 200 colour" })
      .click();
    let picker = page.getByRole("dialog", {
      name: "primary 200 manual colour picker",
    });
    let hexInput = picker.getByLabel("primary 200 manual colour HEX value");
    await hexInput.fill("#d8c65a");
    await hexInput.press("Enter");
    await details.getByRole("radio", { name: "Anchor" }).click();
    await details.getByRole("button", { name: "Close shade details" }).click();

    await manualShade.click();
    details = page.getByRole("dialog", {
      name: "primary 350 shade details",
    });
    await details
      .getByRole("button", { name: "Edit primary 350 colour" })
      .click();
    picker = page.getByRole("dialog", {
      name: "primary 350 manual colour picker",
    });
    hexInput = picker.getByLabel("primary 350 manual colour HEX value");
    await hexInput.fill("#4f7a92");
    await hexInput.press("Enter");
    await details.getByRole("button", { name: "Close shade details" }).click();

    await expect(anchorShade.getByLabel("Colour anchor")).toBeVisible();
    await expect(manualShade.getByLabel("Manual colour")).toBeVisible();

    await page
      .getByRole("button", { name: "Open primary colour details" })
      .click();
    const colourDialog = page.locator("dialog").filter({
      has: page.getByLabel("Colour name"),
    });
    await expect(colourDialog).toBeVisible();
    const transitionWarnings = colourDialog.getByRole("list", {
      name: "Transition warnings",
    });
    await expect(transitionWarnings).toContainText("have a large hue change");
    await expect(transitionWarnings).toContainText(
      "Manual shade 350 creates an uneven transition",
    );
    await colourDialog.getByRole("button", { name: "Reset changes" }).click();

    const confirmation = page.getByRole("alertdialog", {
      name: "Reset custom shade changes?",
    });
    await expect(confirmation).toContainText(
      "1 custom anchor and 1 manual shade",
    );
    await confirmation.getByRole("button", { name: "Cancel" }).click();
    await expect(anchorShade.getByLabel("Colour anchor")).toBeVisible();

    await colourDialog.getByRole("button", { name: "Reset changes" }).click();
    await confirmation.getByRole("button", { name: "Reset changes" }).click();

    await expect(
      colourDialog.getByRole("button", { name: "Reset changes" }),
    ).toHaveCount(0);
    await expect(transitionWarnings).toHaveCount(0);
    await expect(anchorShade.getByLabel("Colour anchor")).toHaveCount(0);
    await expect(manualShade.getByLabel("Manual colour")).toHaveCount(0);

    await colourDialog
      .getByRole("button", { name: "Close colour details" })
      .click();
    await page.reload();
    await expect(anchorShade.getByLabel("Colour anchor")).toHaveCount(0);
    await expect(manualShade.getByLabel("Manual colour")).toHaveCount(0);
  });
});

test.describe("Colour track actions", () => {
  test("greys out OKLCH slider areas outside sRGB", async ({
    seededPage: page,
  }) => {
    await page
      .getByRole("button", { name: "Choose primary source colour" })
      .click();

    const picker = page.getByRole("dialog", {
      name: "primary source colour picker",
    });
    await picker.getByLabel("Colour format").click();
    await page.getByRole("option", { name: "OKLCH", exact: true }).click();
    await expect(picker.getByLabel("Chroma slider")).toHaveAttribute(
      "data-has-out-of-gamut",
      "true",
    );
    await expect(picker.getByLabel("Hue slider")).toHaveAttribute(
      "data-has-out-of-gamut",
      "true",
    );
  });

  test("renames the project and supports drag reordering", async ({
    seededPage: page,
  }) => {
    const projectName = page.getByLabel("Project name", { exact: true });
    await projectName.fill("Brand palette");
    await projectName.blur();
    await page.reload();
    await expect(projectName).toHaveValue("Brand palette");

    const trackRows = page.locator("article[data-track-id]");
    const primaryHandle = page.getByRole("button", {
      name: "Drag primary track to reorder",
    });
    const infoRow = page.locator('article[data-track-id="info"]');

    await primaryHandle.dragTo(infoRow, {
      targetPosition: { x: 100, y: 60 },
    });

    await expect(trackRows.last()).toHaveAttribute("data-track-id", "primary");
  });

  test("supports edit, keyboard reorder, duplicate, and delete from the colour dialog", async ({
    seededPage: page,
  }) => {
    const trackRows = page.locator("article[data-track-id]");
    await page
      .getByRole("button", { name: "Open primary colour details" })
      .click();

    let colourDialog = page.locator("dialog").filter({
      has: page.getByLabel("Colour name"),
    });
    await colourDialog.getByLabel("Colour name").fill("brand");
    await colourDialog.getByRole("button", { name: "Save changes" }).click();
    await expect(
      page.getByRole("button", { name: "Open brand colour details" }),
    ).toBeVisible();

    const brandHandle = page.getByRole("button", {
      name: "Drag brand track to reorder",
    });
    await brandHandle.focus();
    await page.keyboard.press("ArrowDown");
    await expect(trackRows.nth(0)).toHaveAttribute(
      "data-track-id",
      "secondary",
    );
    await expect(trackRows.nth(1)).toHaveAttribute("data-track-id", "primary");

    await page
      .getByRole("button", { name: "Open brand colour details" })
      .click();
    colourDialog = page.locator("dialog").filter({
      has: page.getByLabel("Colour name"),
    });
    await colourDialog.getByRole("button", { name: "Duplicate" }).click();
    await expect(trackRows).toHaveCount(8);
    await expect(
      page.getByRole("button", { name: "Open brand-copy colour details" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Add colour" }).click();
    await expect(trackRows).toHaveCount(9);

    await page
      .getByRole("button", { name: "Open custom-9 colour details" })
      .click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    const deleteConfirmation = page.getByRole("alertdialog", {
      name: "Delete custom-9?",
    });
    await deleteConfirmation
      .getByRole("button", { name: "Delete colour" })
      .click();
    await expect(trackRows).toHaveCount(8);
  });

  test("supports quick name and source colour edits on the card", async ({
    seededPage: page,
  }) => {
    const name = page.getByLabel("Rename info colour");
    await name.fill("quick-info");
    await name.press("Enter");
    await expect(
      page.getByRole("button", { name: "Open quick-info colour details" }),
    ).toBeVisible();

    await page
      .getByRole("button", { name: "Choose quick-info source colour" })
      .click();
    const hue = page.getByRole("slider", {
      name: "quick-info source colour hue",
    });
    await hue.hover();
    await expect(hue.locator("..")).toHaveCSS(
      "background-image",
      /linear-gradient/,
    );
    const hex = page.getByLabel("quick-info source colour HEX value");
    await hex.fill("#336699");
    await hex.press("Enter");
    await expect(
      page.getByRole("button", { name: "Choose quick-info source colour" }),
    ).toHaveCSS("background-color", "rgb(51, 102, 153)");
  });
});

test.describe("Interface feedback", () => {
  test("studios do not start a new project", async ({ seededPage: page }) => {
    await expect(page.getByRole("button", { name: "New project" })).toHaveCount(
      0,
    );

    await page
      .getByRole("navigation", { name: "Blueprint workspaces" })
      .getByRole("link", { name: "Typography" })
      .click();
    await expect(page).toHaveURL(/\/typography\/?$/);
    /* Palette-only seeds still land on the leftover type empty state. Home is
       the create door either way; this page must not grow a New project. */
    await expect(
      page
        .getByRole("heading", { name: "This slice isn't open yet" })
        .or(page.getByRole("region", { name: "Generated type steps" })),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "New project" })).toHaveCount(
      0,
    );
  });

  test("previews CSS and Design Tokens exports", async ({
    seededPage: page,
  }) => {
    await page.getByRole("button", { name: "Export palette" }).click();
    const exportDialog = page.getByRole("dialog", {
      name: "Export design system",
    });
    const exportPreview = page.getByRole("region", {
      name: "Export preview",
    });
    await expect(exportPreview.getByRole("code")).toContainText(":root");

    await exportDialog.getByRole("button", { name: "Design Tokens" }).click();
    await expect(exportPreview.getByRole("code")).toContainText(
      "Colour palette exported from Blueprint",
    );
  });

  test("confirms before importing over the current project", async ({
    seededPage: page,
  }) => {
    const importedProject = {
      kind: "blueprint-palette",
      version: 1,
      project: {
        ...defaultProject(),
        name: "Imported palette",
      },
    };

    const chooseImportFile = async () => {
      await page.getByRole("button", { name: "Export palette" }).click();
      const chooserPromise = page.waitForEvent("filechooser");
      await page.getByRole("button", { name: "Import project" }).click();
      const chooser = await chooserPromise;
      await chooser.setFiles({
        name: "imported.blueprint.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(importedProject)),
      });
    };

    await chooseImportFile();
    const confirmation = page.getByRole("alertdialog", {
      name: "Replace current project?",
    });
    await confirmation.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByLabel("Project name")).toHaveValue(
      "My colour system",
    );

    await chooseImportFile();
    await confirmation.getByRole("button", { name: "Import project" }).click();
    await expect(page.getByLabel("Project name")).toHaveValue(
      "Imported palette",
    );
    await page.reload();
    await expect(page.getByLabel("Project name")).toHaveValue(
      "Imported palette",
    );
  });

  test("imports from the header", async ({ seededPage: page }) => {
    const importButton = page.getByRole("button", { name: "Import palette" });
    await expect(importButton).toBeVisible();

    const chooserPromise = page.waitForEvent("filechooser");
    await importButton.click();
    const chooser = await chooserPromise;
    await chooser.setFiles({
      name: "header-import.blueprint.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({
          kind: "blueprint-palette",
          version: 1,
          project: { ...defaultProject(), name: "Header import" },
        }),
      ),
    });

    await expect(
      page.getByRole("alertdialog", { name: "Replace current project?" }),
    ).toBeVisible();
  });

  test("announces creation errors", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();

    await page.getByRole("button", { name: "New project" }).click();
    const dialog = page.getByRole("dialog", { name: "New project" });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Project name").fill("");
    await dialog.getByRole("button", { name: "Create workspace" }).click();

    const error = dialog.getByText("Enter a project name.", { exact: true });
    await expect(error).toHaveAttribute("role", "alert");
  });

  test("imports a saved project from Home", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();

    const importedProject = {
      kind: "blueprint-palette",
      version: 1,
      project: { ...defaultProject(), name: "Opened project" },
    };
    const chooserPromise = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Import project" }).click();
    const chooser = await chooserPromise;
    await chooser.setFiles({
      name: "opened.blueprint.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(importedProject)),
    });

    await expect(page).toHaveURL(/\/colour\/?$/);
    await expect(page.getByLabel("Project name")).toHaveValue("Opened project");
  });
});
