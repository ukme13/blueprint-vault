import { readFileSync } from "node:fs";
import {
  defaultProject,
  expect,
  seedProject,
  test,
  WORKSPACE_STORAGE_KEY,
} from "./fixtures";
import type { Page } from "@playwright/test";

/**
 * The spacing scale, edited.
 *
 * See docs/roadmap/scale-studio.md. That the preview page reaches for no
 * hardcoded measurement is checked at the source, in packages/ui; this covers
 * the scale being editable and surviving a reload.
 */

/**
 * Seed a workspace, open the scale studio, and wait for it to have read one.
 *
 * The wait is the point. `goto` resolves on load, which is before the effect
 * that reads storage has populated the scales, the palette and the name — and
 * under StrictMode that effect runs twice, so the window is wider in dev than
 * in production. Acting inside it fails in ways that look nothing like a race:
 * `fill` on the name appended to the seeded value instead of replacing it,
 * because the re-read landed between the clear and the insert, and the
 * elevation shadow came out a shade off because the palette it is drawn from
 * had arrived for one swatch and not the other.
 *
 * Neither reproduced on CI, which builds for production and has no StrictMode
 * to double the effect. The same wait is why the `seededPage` fixture exists;
 * this spec predates using it and needs its own.
 *
 * The name is the last thing that effect sets, so seeing it is seeing the load
 * finish. Reloads mid-test already assert on rendered content and gate
 * themselves.
 */
async function openScaleStudio(page: Page) {
  await seedProject(page);
  await page.goto("/scale");
  await expect(page.getByLabel("Project name")).toHaveValue(
    defaultProject().name,
  );
}

test.describe("The spacing studio", () => {
  test("shows the seeded scale as pixels and rems", async ({ page }) => {
    await openScaleStudio(page);

    const steps = page.getByRole("region", { name: "Generated spacing steps" });
    await expect(steps).toBeVisible();
    /* 4px base: step 4 is 16px, which is 1rem against the browser root rather
       than against the type scale's own base. */
    await expect(steps.getByText("16px", { exact: true })).toBeVisible();
    await expect(steps.getByText("1rem", { exact: true })).toBeVisible();
  });

  test("prunes a step, and keeps it pruned", async ({ page }) => {
    await openScaleStudio(page);

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
    await openScaleStudio(page);

    const steps = page.getByRole("region", { name: "Generated spacing steps" });
    await expect(steps.getByText("16px", { exact: true })).toBeVisible();

    const slider = page.getByRole("slider", { name: /Base unit/ });
    await slider.focus();
    await slider.press("ArrowRight");

    await expect(steps.getByText("20px", { exact: true })).toBeVisible();
  });
});

test.describe("The radius editor", () => {
  test("moves the named sizes and leaves the fixed ones", async ({ page }) => {
    /* Zero scaled is still zero and half a pill is still a pill, so the
       multiplier says nothing useful about either. */
    await openScaleStudio(page);

    const radius = page.getByRole("region", { name: "Radius" });
    await expect(radius.getByText("8px", { exact: true })).toBeVisible();
    await expect(radius.getByText(/9999px/)).toBeVisible();

    const slider = page.getByRole("slider", { name: /Roundness/ });
    await slider.focus();
    await slider.press("ArrowRight");

    // 0.25 up from 1: element goes 8 -> 10, and the pill does not move.
    await expect(radius.getByText("10px", { exact: true })).toBeVisible();
    await expect(radius.getByText(/9999px/)).toBeVisible();
  });

  test("keeps the roundness across a reload", async ({ page }) => {
    await openScaleStudio(page);

    const slider = page.getByRole("slider", { name: /Roundness/ });
    await slider.focus();
    await slider.press("ArrowRight");

    await expect
      .poll(() =>
        page.evaluate((key) => {
          const raw = window.localStorage.getItem(key);
          if (!raw) return null;
          return (JSON.parse(raw) as { radius?: { multiplier: number } }).radius
            ?.multiplier;
        }, WORKSPACE_STORAGE_KEY),
      )
      .toBe(1.25);

    await page.reload();
    await expect(
      page.getByRole("slider", { name: /Roundness: 1.25/ }),
    ).toBeVisible();
  });
});

test.describe("The elevation editor", () => {
  test("shows each level on both grounds", async ({ page }) => {
    /* The whole reason strength is held per mode: the same black at the same
       alpha reads as nothing once the background is already dark, and one
       preview would hide it. */
    await openScaleStudio(page);

    const elevation = page.getByRole("region", { name: "Elevation" });
    await expect(elevation.getByLabel("Low on light")).toBeVisible();
    await expect(elevation.getByLabel("Low on dark")).toBeVisible();
    await expect(elevation.getByLabel("High on dark")).toBeVisible();
  });

  test("casts the same colour in both modes, more strongly in dark", async ({
    page,
  }) => {
    await openScaleStudio(page);

    const elevation = page.getByRole("region", { name: "Elevation" });
    const shadowOf = (name: string) =>
      elevation
        .getByLabel(name)
        .evaluate((node) => getComputedStyle(node).boxShadow);

    const light = await shadowOf("Low on light");
    const dark = await shadowOf("Low on dark");

    const channels = (value: string) =>
      [...value.matchAll(/rgba?\((\d+, \d+, \d+)/g)].map((m) => m[1]);
    const alphas = (value: string) =>
      [...value.matchAll(/rgba\([^)]*?,\s*([\d.]+)\)/g)].map((m) =>
        Number(m[1]),
      );

    expect(channels(dark)).toEqual(channels(light));
    expect(Math.max(...alphas(dark))).toBeGreaterThan(
      Math.max(...alphas(light)),
    );
  });

  test("keeps an edited strength across a reload", async ({ page }) => {
    await openScaleStudio(page);

    const slider = page.getByRole("slider", { name: "Low light strength" });
    await slider.focus();
    await slider.press("ArrowRight");

    await expect
      .poll(() =>
        page.evaluate((key) => {
          const raw = window.localStorage.getItem(key);
          if (!raw) return null;
          const stored = JSON.parse(raw) as {
            elevation?: {
              levels: Array<{
                id: string;
                layers: Array<{ opacity: { light: number } }>;
              }>;
            };
          };
          return stored.elevation?.levels.find((level) => level.id === "low")
            ?.layers[0]?.opacity.light;
        }, WORKSPACE_STORAGE_KEY),
      )
      .toBeCloseTo(0.15, 5);

    await page.reload();
    await expect(
      page
        .getByRole("region", { name: "Elevation" })
        .getByLabel("Low on light"),
    ).toBeVisible();
  });
});

test.describe("The scale studio's chrome", () => {
  test("exports the whole system, not only the scales", async ({ page }) => {
    /* The tokens used to ship only from the Colour page, so somebody who built
       a spacing scale here had to go elsewhere to get it out. */
    await openScaleStudio(page);

    await page.getByRole("button", { name: "Export", exact: true }).click();
    const preview = page.getByRole("region", { name: "Export preview" });
    await expect(preview).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download" }).click();
    const file = await downloadPromise;
    const css = readFileSync(await file.path(), "utf8");

    /* The same output Colour produces — one dialog, one system. */
    expect(css).toContain("--spacing-4:");
    expect(css).toContain("--radius-element:");
    expect(css).toMatch(/--shadow-low:/);
    expect(css).toMatch(/--color-primary-\d+:/);
    expect(css).toContain("--color-action-primary:");
  });

  test("offers no import, because it cannot confirm one", async ({ page }) => {
    await openScaleStudio(page);
    await page.getByRole("button", { name: "Export", exact: true }).click();

    await expect(
      page.getByRole("region", { name: "Export preview" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Import project" }),
    ).toHaveCount(0);
  });

  test("renames the workspace, and the other studios see it", async ({
    page,
  }) => {
    /* The name belongs to the workspace, so every page that shows it can edit
       it — and this one could not. */
    await openScaleStudio(page);

    const field = page.getByLabel("Project name");
    await field.fill("Renamed here");
    await field.blur();

    await page.goto("/");
    await expect(page.getByLabel("Project name")).toHaveValue("Renamed here");
  });
});
