import { expect, test } from "./fixtures";

test.describe("Accessibility preview", () => {
  test("explains text, control, focus, and semantic colour results", async ({
    seededPage: page,
  }) => {
    await page.getByRole("button", { name: "Preview" }).click();

    await expect(
      page.getByRole("heading", { name: "Text contrast" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "White or dark text" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Controls and focus" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Semantic colour distinction" }),
    ).toBeVisible();

    const primaryAction = page
      .getByText("Primary action text", { exact: true })
      .locator("../..");
    await expect(primaryAction).toContainText(/\d+\.\d:1 — Passes (AA|AAA)/);

    const focus = page
      .getByText("Keyboard focus colour", { exact: true })
      .locator("../..");
    await expect(focus).toContainText(/\d+\.\d:1/);
    await expect(focus).toContainText(/Focus (colour passes|indicator needs)/);

    const softSurface = page
      .getByText("Soft surface boundary", { exact: true })
      .locator("../..");
    await expect(softSurface).toContainText("Advisory");
    await expect(softSurface).toContainText("Optional design check");

    await expect(
      page.getByText(
        "This is perceptual design guidance, not a WCAG pass or fail.",
        { exact: false },
      ),
    ).toBeVisible();
  });

  test("continues to render after the primary track is renamed", async ({
    seededPage: page,
  }) => {
    await page
      .getByRole("button", { name: "Open primary colour details" })
      .press("Enter");
    const colourDialog = page.locator("dialog").filter({
      has: page.getByLabel("Colour name"),
    });
    await colourDialog.getByLabel("Colour name").fill("brand");
    await colourDialog.getByRole("button", { name: "Save changes" }).click();
    await page.getByRole("button", { name: "Preview" }).click();

    await expect(
      page.getByRole("heading", { name: "Palette in context" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Accessibility" }),
    ).toBeVisible();
  });

  test("stays inside the viewport on a small screen", async ({
    seededPage: page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.getByRole("button", { name: "Preview" }).click();
    await expect(
      page.getByRole("heading", { name: "Accessibility" }),
    ).toBeVisible();

    const widths = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    }));
    expect(widths.document).toBeLessThanOrEqual(widths.viewport);
  });
});
