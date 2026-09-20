import { expect, test } from "@playwright/test";
import { seedProject } from "./fixtures";

test.describe("Bento Overview Studio", () => {
  test("renders 4-column bento board and responds to rail navigation", async ({
    page,
  }) => {
    await seedProject(page);
    await page.goto("/overview");

    await expect(page.locator("[data-overview-studio]")).toBeVisible();
    await expect(page.locator("[data-overview-grid]")).toBeVisible();

    // Check studio rail selection
    const railItem = page
      .getByRole("navigation", { name: "Blueprint workspaces" })
      .getByRole("link", { name: "Overview" });
    await expect(railItem).toBeVisible();

    // Column 1: Color cards with shade ramps showing all project colors
    const colorColumn = page.locator("[data-column='colors']");
    await expect(colorColumn).toBeVisible();
    await expect(colorColumn.locator("[data-color-card]")).toHaveCount(7);
    await expect(
      colorColumn.locator("[data-color-card='primary']"),
    ).toBeVisible();
    await expect(
      colorColumn.locator("[data-color-card='secondary']"),
    ).toBeVisible();
    await expect(
      colorColumn.locator("[data-color-card='neutral']"),
    ).toBeVisible();
    await expect(
      colorColumn.locator("[data-color-card='success']"),
    ).toBeVisible();
    await expect(
      colorColumn.locator("[data-color-card='warning']"),
    ).toBeVisible();
    await expect(
      colorColumn.locator("[data-color-card='error']"),
    ).toBeVisible();
    await expect(colorColumn.locator("[data-color-card='info']")).toBeVisible();

    // Column 2: Typography cards with specimens
    const typeColumn = page.locator("[data-column='typography']");
    await expect(typeColumn).toBeVisible();
    await expect(typeColumn.locator("[data-type-card]")).toHaveCount(3);
    await expect(typeColumn.getByText("Headline")).toBeVisible();
    await expect(typeColumn.getByText("Body")).toBeVisible();
    await expect(typeColumn.getByText("Label")).toBeVisible();

    // Column 3: Components & Buttons
    const componentsColumn = page.locator("[data-column='components']");
    await expect(componentsColumn).toBeVisible();
    const primaryBtn = componentsColumn.getByRole("button", {
      name: "Primary",
    });
    const secondaryBtn = componentsColumn.getByRole("button", {
      name: "Secondary",
    });
    await expect(primaryBtn).toBeVisible();
    await expect(secondaryBtn).toBeVisible();
    await expect(
      componentsColumn.getByRole("button", { name: "Inverted" }),
    ).toBeVisible();
    await expect(
      componentsColumn.getByRole("button", { name: "Outlined" }),
    ).toBeVisible();
    await expect(componentsColumn.getByText("Label")).toBeVisible();

    // Secondary button has its secondary palette color applied (teal #0f9d8f)
    const secondaryBg = await secondaryBtn.evaluate(
      (el) => window.getComputedStyle(el).backgroundColor,
    );
    expect(secondaryBg).toContain("157");

    // Column 4: Navigation and Action Tools
    const toolsColumn = page.locator("[data-column='tools']");
    await expect(toolsColumn).toBeVisible();
    await expect(toolsColumn.getByPlaceholder("Search")).toBeVisible();
    await expect(
      toolsColumn.getByRole("navigation", { name: "Specimen navigation" }),
    ).toBeVisible();
    await expect(toolsColumn.getByTitle("Wand tool")).toBeVisible();
    await expect(toolsColumn.getByTitle("Shapes")).toBeVisible();
    await expect(toolsColumn.getByTitle("Tag")).toBeVisible();
    await expect(toolsColumn.getByTitle("Delete")).toBeVisible();
  });

  test("dynamically hides missing color buttons, icons, and typography roles", async ({
    page,
  }) => {
    // Seed project with only 1 color track (primary)
    const minimalProject = {
      name: "Minimal System",
      tracks: [{ id: "primary", name: "primary", seedHex: "#7646ab" }],
      lightnessPattern: "custom",
      lightnessValues: [
        97.5, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 25, 20,
        15, 10, 5,
      ],
    };

    await seedProject(page, minimalProject);
    await page.goto("/overview");

    await expect(page.locator("[data-overview-studio]")).toBeVisible();

    // Column 1: Exactly 1 color card (Primary)
    const colorColumn = page.locator("[data-column='colors']");
    await expect(colorColumn.locator("[data-color-card]")).toHaveCount(1);
    await expect(
      colorColumn.locator("[data-color-card='primary']"),
    ).toBeVisible();

    // Column 3: Secondary button should be completely hidden
    const componentsColumn = page.locator("[data-column='components']");
    await expect(
      componentsColumn.getByRole("button", { name: "Primary" }),
    ).toBeVisible();
    await expect(
      componentsColumn.getByRole("button", { name: "Secondary" }),
    ).toHaveCount(0);

    // Tertiary icon card should be hidden
    await expect(
      componentsColumn.locator("[data-icon-card='tertiary']"),
    ).toHaveCount(0);

    // Column 4: Shapes (secondary) and Delete (error) should be hidden
    const toolsColumn = page.locator("[data-column='tools']");
    await expect(toolsColumn.getByTitle("Wand tool")).toBeVisible();
    await expect(toolsColumn.getByTitle("Shapes")).toHaveCount(0);
    await expect(toolsColumn.getByTitle("Delete")).toHaveCount(0);
  });
});
