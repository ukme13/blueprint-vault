import { expect, seedProject, test, WORKSPACE_STORAGE_KEY } from "./fixtures";

/**
 * The spacing scale, edited.
 *
 * See docs/roadmap/scale-studio.md. That the preview page reaches for no
 * hardcoded measurement is checked at the source, in packages/ui; this covers
 * the scale being editable and surviving a reload.
 */

test.describe("The spacing studio", () => {
  test("shows the seeded scale as pixels and rems", async ({ page }) => {
    await seedProject(page);
    await page.goto("/scale");

    const steps = page.getByRole("region", { name: "Generated spacing steps" });
    await expect(steps).toBeVisible();
    /* 4px base: step 4 is 16px, which is 1rem against the browser root rather
       than against the type scale's own base. */
    await expect(steps.getByText("16px", { exact: true })).toBeVisible();
    await expect(steps.getByText("1rem", { exact: true })).toBeVisible();
  });

  test("prunes a step, and keeps it pruned", async ({ page }) => {
    await seedProject(page);
    await page.goto("/scale");

    const steps = page.getByRole("region", { name: "Generated spacing steps" });
    const before = await steps.getByRole("listitem").count();

    await page
      .getByRole("region", { name: "Steps" })
      .getByRole("button", { name: "10", exact: true })
      .click();

    await expect(steps.getByRole("listitem")).toHaveCount(before - 1);

    await expect
      .poll(() =>
        page.evaluate((key) => {
          const raw = window.localStorage.getItem(key);
          if (!raw) return null;
          return (JSON.parse(raw) as { spacing?: { steps: number[] } }).spacing
            ?.steps;
        }, WORKSPACE_STORAGE_KEY),
      )
      .not.toContain(10);

    await page.reload();
    await expect(
      page
        .getByRole("region", { name: "Generated spacing steps" })
        .getByRole("listitem"),
    ).toHaveCount(before - 1);
  });

  test("moves every step when the base unit changes", async ({ page }) => {
    /* The grid is the model: one number moves the whole scale, which is what
       makes it a scale rather than a list of sizes. */
    await seedProject(page);
    await page.goto("/scale");

    const steps = page.getByRole("region", { name: "Generated spacing steps" });
    await expect(steps.getByText("16px", { exact: true })).toBeVisible();

    const slider = page.getByRole("slider", { name: /Base unit/ });
    await slider.focus();
    await slider.press("ArrowRight");

    await expect(steps.getByText("20px", { exact: true })).toBeVisible();
  });
});
