import { expect, test } from "./fixtures";

test.describe("Shade details", () => {
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
      name: "WCAG 2",
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
    await expect(contrastMode).toHaveAttribute("aria-pressed", "true");
    await expect(contrastRatios).toHaveCount(120);

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
    await expect(details.getByText("OKLCH", { exact: true })).toBeVisible();
    await expect(
      details.getByRole("button", { name: "Copy OKLCH value" }),
    ).toContainText("oklch(");
    await expect(
      details.getByRole("region", { name: "WCAG 2 contrast result" }),
    ).toContainText("Against custom #7646AB");
    await expect(details.getByText("Large text", { exact: true })).toBeVisible();
    await expect(details.getByText("Small text", { exact: true })).toBeVisible();
    await expect(details.getByText("Graphics", { exact: true })).toBeVisible();

    const copyButton = details.getByRole("button", {
      name: "Copy OKLCH value",
    });
    await copyButton.click();
    await expect(copyButton).toContainText("Copied");

    await details.getByRole("button", { name: "Close shade details" }).click();
    await expect(details).toBeHidden();
    await expect(shade).toBeFocused();

    await contrastMode.click();
    await expect(contrastMode).toHaveAttribute("aria-pressed", "false");
    await expect(contrastRatios).toHaveCount(0);
  });
});

test.describe("Colour track actions", () => {
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
      .press("Enter");

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
    await expect(trackRows.nth(0)).toHaveAttribute("data-track-id", "neutral");
    await expect(trackRows.nth(1)).toHaveAttribute("data-track-id", "primary");

    await page
      .getByRole("button", { name: "Open brand colour details" })
      .press("Enter");
    colourDialog = page.locator("dialog").filter({
      has: page.getByLabel("Colour name"),
    });
    await colourDialog.getByRole("button", { name: "Duplicate" }).click();
    await expect(trackRows).toHaveCount(7);
    await expect(
      page.getByRole("button", { name: "Open brand-copy colour details" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Add colour" }).click();
    await expect(trackRows).toHaveCount(8);

    await page
      .getByRole("button", { name: "Open custom-8 colour details" })
      .press("Enter");
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    const deleteConfirmation = page.getByRole("alertdialog", {
      name: "Delete custom-8?",
    });
    await deleteConfirmation
      .getByRole("button", { name: "Delete colour" })
      .click();
    await expect(trackRows).toHaveCount(7);
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
  test("asks before starting a new project", async ({ seededPage: page }) => {
    const newProject = page.getByRole("button", { name: "New project" });
    await newProject.click();

    const confirmation = page.getByRole("alertdialog", {
      name: "Start a new project?",
    });
    await expect(confirmation).toBeVisible();

    await confirmation.getByRole("button", { name: "Cancel" }).click();
    await expect(confirmation).toBeHidden();
    await expect(
      page.getByRole("region", { name: "Palette toolbar" }),
    ).toBeVisible();

    await newProject.click();
    await confirmation
      .getByRole("button", { name: "Start new project" })
      .click();
    await expect(page.getByLabel("Project name")).toBeVisible();
  });

  test("shows an error when clipboard access fails", async ({
    seededPage: page,
  }) => {
    await page.evaluate(() => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async () => {
            throw new Error("Clipboard blocked");
          },
        },
      });
    });

    const exportButton = page.getByRole("button", {
      name: "Export palette CSS",
    });
    await exportButton.click();
    await expect(exportButton).toContainText("Copy failed");
    await expect(
      page.getByText("Could not copy the palette CSS.", { exact: true }),
    ).toBeAttached();
  });

  test("announces creation errors", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();

    await page.getByLabel("Project name").fill("");
    await page.getByRole("button", { name: "Create palette" }).click();

    const error = page.getByText("Enter a project name.", { exact: true });
    await expect(error).toHaveAttribute("role", "alert");
  });
});
