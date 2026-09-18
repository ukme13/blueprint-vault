import { readFileSync } from "node:fs";
import type { Locator, Page } from "@playwright/test";
import { defaultProject, WORKSPACE_STORAGE_KEY } from "./fixtures";
import { expect, showScaleView, test } from "./scale-fixtures";
import { fillHybridNumber } from "./typography-fixtures";

/**
 * The spacing scale, edited.
 *
 * See docs/roadmap/scale-studio.md. That the preview page reaches for no
 * hardcoded measurement is checked at the source, in packages/ui; this covers
 * the scale being editable and surviving a reload.
 */

test.describe("The spacing studio", () => {
  test("shows the seeded scale as pixels and rems", async ({
    seededPage: page,
  }) => {
    const steps = page.getByRole("region", { name: "Generated spacing steps" });
    await expect(steps).toBeVisible();
    /* 4px base: step 4 is 16px, which is 1rem against the browser root rather
       than against the type scale's own base. */
    await expect(steps.getByText("16px", { exact: true })).toBeVisible();
    await expect(steps.getByText("1rem", { exact: true })).toBeVisible();
  });

  test("prunes a step, and keeps it pruned", async ({ seededPage: page }) => {
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

  test("moves every step when the base unit changes", async ({
    seededPage: page,
  }) => {
    /* The grid is the model: one number moves the whole scale, which is what
       makes it a scale rather than a list of sizes. */

    const steps = page.getByRole("region", { name: "Generated spacing steps" });
    await expect(steps.getByText("16px", { exact: true })).toBeVisible();

    await page.getByRole("textbox", { name: "Custom number" }).click();
    await page.keyboard.type("5");
    const field = page.getByLabel("Base unit", { exact: true });
    await expect(field).toHaveValue("5");
    await field.blur();

    await expect(steps.getByText("20px", { exact: true })).toBeVisible();
  });

  test("moves layout gaps and leaves the fine grid", async ({
    seededPage: page,
  }) => {
    /* Density is the control that makes the page roomier without turning a
       2px hairline into 4px, which is what switching the base unit does. */

    const steps = page.getByRole("region", { name: "Generated spacing steps" });
    const hairline = steps.locator("li", {
      has: page.getByText("--spacing-0-5", { exact: true }),
    });
    const padding = steps.locator("li", {
      has: page.getByText("--spacing-4", { exact: true }),
    });

    await expect(hairline).toContainText("2px");
    await expect(padding).toContainText("16px");

    const slider = page.getByRole("slider", { name: /Density/ });
    await slider.focus();
    await slider.press("ArrowRight");

    await expect(hairline).toContainText("2px");
    await expect(padding).toContainText("20px");
    await expect(hairline).toContainText("grid");

    await expect
      .poll(() =>
        page.evaluate((key) => {
          const raw = window.localStorage.getItem(key);
          if (!raw) return null;
          return (JSON.parse(raw) as { spacing?: { density?: number } }).spacing
            ?.density;
        }, WORKSPACE_STORAGE_KEY),
      )
      .toBe(1.25);
  });

  test("keeps the grid label and the bar on one row", async ({
    seededPage: page,
  }) => {
    /* The word "grid" is a fifth child if it is its own cell in a four-column
       row, and the bar wraps under the token name as a 2px tick. */

    const hairline = page
      .getByRole("region", { name: "Generated spacing steps" })
      .locator("li", { has: page.getByText("--spacing-0-5", { exact: true }) });
    const label = hairline.getByText("grid", { exact: true });
    const bar = hairline.locator("[aria-hidden='true']");

    const labelBox = await label.boundingBox();
    const barBox = await bar.boundingBox();
    expect(labelBox).toBeTruthy();
    expect(barBox).toBeTruthy();
    expect(Math.abs((labelBox?.y ?? 0) - (barBox?.y ?? 0))).toBeLessThan(4);
    expect(barBox?.x ?? 0).toBeGreaterThan(labelBox?.x ?? 0);
  });
});

test.describe("The radius editor", () => {
  test("moves the named sizes and leaves the fixed ones", async ({
    seededPage: page,
  }) => {
    /* Zero scaled is still zero and half a pill is still a pill, so the
       multiplier says nothing useful about either. */

    await showScaleView(page, "Radius");
    const radius = page.getByRole("region", { name: "Radius", exact: true });
    await expect(page.getByLabel("Element", { exact: true })).toContainText(
      "8",
    );
    await expect(radius.getByText(/9999px/)).toBeVisible();

    const slider = page.getByRole("slider", { name: /Roundness/ });
    await slider.focus();
    await slider.press("ArrowRight");

    // 0.25 up from 1: element goes 8 -> 10, and the pill does not move.
    await expect(page.getByLabel("Element", { exact: true })).toContainText(
      "10",
    );
    await expect(radius.getByText(/9999px/)).toBeVisible();
  });

  test("keeps the roundness across a reload", async ({ seededPage: page }) => {
    await showScaleView(page, "Radius");
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
    await showScaleView(page, "Radius");
    await expect(
      page.getByRole("slider", { name: /Roundness: 1.25/ }),
    ).toBeVisible();
  });

  test("unlinks a named use from the multiplier", async ({
    seededPage: page,
  }) => {
    /* Squarer buttons, rounder cards: typing 20 on Element holds that use
       while Container still follows roundness. */

    await showScaleView(page, "Radius");
    const radius = page.getByRole("region", { name: "Radius", exact: true });

    await fillHybridNumber(page, "Element", "20");
    await expect(page.getByLabel("Element", { exact: true })).toHaveValue("20");

    const slider = page.getByRole("slider", { name: /Roundness/ });
    await slider.focus();
    await slider.press("ArrowRight");

    await expect(page.getByLabel("Element", { exact: true })).toHaveValue("20");
    await expect(
      radius.getByRole("button", { name: "Container", exact: true }),
    ).toContainText("15");
    await expect(radius.getByText(/9999px/)).toBeVisible();
    await expect(radius.getByText("0px · fixed")).toBeVisible();

    await expect
      .poll(() =>
        page.evaluate((key) => {
          const raw = window.localStorage.getItem(key);
          if (!raw) return null;
          const tokens = (
            JSON.parse(raw) as {
              radius?: { tokens: Array<{ id: string; unlinkedPx?: number }> };
            }
          ).radius?.tokens;
          return tokens?.find((token) => token.id === "element")?.unlinkedPx;
        }, WORKSPACE_STORAGE_KEY),
      )
      .toBe(20);
  });

  test("picking Follow roundness binds a use again", async ({
    seededPage: page,
  }) => {
    await showScaleView(page, "Radius");
    await fillHybridNumber(page, "Element", "20");

    await page.getByRole("button", { name: "Apply preset" }).click();
    await page.getByRole("option", { name: /Follow roundness/ }).click();

    await expect(page.getByLabel("Element", { exact: true })).toContainText(
      "Follow roundness",
    );

    const slider = page.getByRole("slider", { name: /Roundness/ });
    await slider.focus();
    await slider.press("ArrowRight");

    await expect(page.getByLabel("Element", { exact: true })).toContainText(
      "10",
    );
  });
});

test.describe("The elevation editor", () => {
  test("shows each level on both grounds", async ({ seededPage: page }) => {
    /* The whole reason strength is held per mode: the same black at the same
       alpha reads as nothing once the background is already dark, and one
       preview would hide it. */

    await showScaleView(page, "Elevation");
    const elevation = page.getByRole("region", { name: "Elevation" });
    await expect(elevation.getByLabel("Low on light")).toBeVisible();
    await expect(elevation.getByLabel("Low on dark")).toBeVisible();
    await expect(elevation.getByLabel("High on dark")).toBeVisible();
  });

  test("casts the same colour in both modes, more strongly in dark", async ({
    seededPage: page,
  }) => {
    await showScaleView(page, "Elevation");
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

  test("keeps an edited strength across a reload", async ({
    seededPage: page,
  }) => {
    await showScaleView(page, "Elevation");
    const slider = page.getByRole("button", {
      name: "Low light contact and cast",
    });
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
    await showScaleView(page, "Elevation");
    await expect(
      page
        .getByRole("region", { name: "Elevation" })
        .getByLabel("Low on light"),
    ).toBeVisible();
  });

  test("edits the cast without moving the contact", async ({
    seededPage: page,
  }) => {
    await showScaleView(page, "Elevation");
    const slider = page.getByRole("button", {
      name: "High dark contact and cast",
    });
    await slider.focus();
    await slider.press("ArrowUp");

    await expect
      .poll(async () =>
        page.evaluate((key) => {
          const raw = window.localStorage.getItem(key);
          if (!raw) return null;
          const stored = JSON.parse(raw) as {
            elevation?: {
              levels: Array<{
                id: string;
                layers: Array<{ opacity: { dark: number } }>;
              }>;
            };
          };
          const high = stored.elevation?.levels.find(
            (level) => level.id === "high",
          );
          return {
            contact: Number(high?.layers[0]?.opacity.dark.toFixed(2)),
            cast: Number(high?.layers[1]?.opacity.dark.toFixed(2)),
          };
        }, WORKSPACE_STORAGE_KEY),
      )
      .toEqual({ contact: 0.2, cast: 0.35 });
  });

  test("paints the dark sample with a dark card", async ({
    seededPage: page,
  }) => {
    await showScaleView(page, "Elevation");
    const elevation = page.getByRole("region", { name: "Elevation" });
    const fillOf = (name: string) =>
      elevation
        .getByLabel(name)
        .evaluate((node) => getComputedStyle(node).backgroundColor);

    expect(await fillOf("Low on dark")).not.toBe(await fillOf("Low on light"));
  });

  test("paints light and dark pads on their own surfaces", async ({
    seededPage: page,
  }) => {
    /* Contact is X, cast is Y, so one pad holds both layers. Each mode still
       paints on its own card colour, or the two pads would look like copies. */

    await showScaleView(page, "Elevation");
    const paint = (name: string) =>
      page.getByRole("button", { name }).evaluate((node) => {
        const style = getComputedStyle(node);
        return {
          image: style.backgroundImage,
          color: style.backgroundColor,
          radius: style.borderRadius,
        };
      });

    const light = await paint("Low light contact and cast");
    const dark = await paint("Low dark contact and cast");

    expect(light.image).toMatch(/gradient/i);
    expect(dark.color).not.toBe(light.color);
    expect(Number.parseFloat(light.radius)).toBeGreaterThan(12);
  });

  test("picks the shadow colour from the palette", async ({
    seededPage: page,
  }) => {
    await showScaleView(page, "Elevation");
    const sample = page
      .getByRole("region", { name: "Elevation" })
      .getByLabel("Low on light");
    const channels = (value: string) =>
      [...value.matchAll(/rgba?\((\d+, \d+, \d+)/g)].map((m) => m[1]);
    const before = channels(
      await sample.evaluate((node) => getComputedStyle(node).boxShadow),
    );

    await page.getByLabel("Shadow colour track").click();
    await page.getByRole("option", { name: "primary", exact: true }).click();

    await expect
      .poll(async () =>
        channels(
          await sample.evaluate((node) => getComputedStyle(node).boxShadow),
        ),
      )
      .not.toEqual(before);
  });
});

test.describe("The scale studio's chrome", () => {
  test("switches Spacing, Radius and Elevation from the rail", async ({
    seededPage: page,
  }) => {
    const rail = page.getByRole("navigation", { name: "Blueprint workspaces" });
    await expect(rail.getByRole("link", { name: "Spacing" })).toBeVisible();
    await expect(rail.getByRole("link", { name: "Radius" })).toBeVisible();
    await expect(rail.getByRole("link", { name: "Elevation" })).toBeVisible();
    await expect(rail.getByRole("link", { name: "Preview" })).toBeVisible();

    await showScaleView(page, "Radius");
    await expect(
      page.getByRole("region", { name: "Radius", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Generated spacing steps" }),
    ).toHaveCount(0);

    await showScaleView(page, "Elevation");
    await expect(
      page.getByRole("region", { name: "Elevation", exact: true }),
    ).toBeVisible();
  });

  test("undoes a prune, and redo puts it back", async ({
    seededPage: page,
  }) => {
    const steps = page.getByRole("region", { name: "Generated spacing steps" });
    const before = await steps.getByRole("listitem").count();

    await page
      .getByRole("region", { name: "Steps" })
      .getByRole("button", { name: "10", exact: true })
      .click();
    await expect(steps.getByRole("listitem")).toHaveCount(before - 1);

    await page.getByRole("button", { name: "Undo" }).click();
    await expect(steps.getByRole("listitem")).toHaveCount(before);

    await page.getByRole("button", { name: "Redo" }).click();
    await expect(steps.getByRole("listitem")).toHaveCount(before - 1);
  });

  test("undoes the last action on the page, not only this view", async ({
    seededPage: page,
  }) => {
    /* Spacing, radius and elevation share one history: an undo is the last
       thing done in this studio, even after switching views. */

    const steps = page.getByRole("region", { name: "Generated spacing steps" });
    const before = await steps.getByRole("listitem").count();
    await page
      .getByRole("region", { name: "Steps" })
      .getByRole("button", { name: "10", exact: true })
      .click();

    await showScaleView(page, "Radius");
    const slider = page.getByRole("slider", { name: /Roundness/ });
    await slider.focus();
    await slider.press("ArrowRight");
    await expect(page.getByLabel("Element", { exact: true })).toContainText(
      "10",
    );

    await page.keyboard.press("ControlOrMeta+z");
    await expect(page.getByLabel("Element", { exact: true })).toContainText(
      "8",
    );

    await showScaleView(page, "Spacing");
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(steps.getByRole("listitem")).toHaveCount(before);
  });

  test("exports the whole system, not only the scales", async ({
    seededPage: page,
  }) => {
    /* The tokens used to ship only from the Colour page, so somebody who built
       a spacing scale here had to go elsewhere to get it out. */

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

  test("offers no import, because it cannot confirm one", async ({
    seededPage: page,
  }) => {
    await page.getByRole("button", { name: "Export", exact: true }).click();

    await expect(
      page.getByRole("region", { name: "Export preview" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Import project" }),
    ).toHaveCount(0);
  });

  test("renames the workspace, and the other studios see it", async ({
    seededPage: page,
  }) => {
    /* The name belongs to the workspace, so every page that shows it can edit
       it — and this one could not. */

    const field = page.getByLabel("Project name");
    await field.fill("Renamed here");
    await field.blur();

    await page.goto("/colour");
    await expect(page.getByLabel("Project name")).toHaveValue("Renamed here");
  });
});

test.describe("Layout uses", () => {
  test("Spacing Uses lists inset and gap, not surface radius", async ({
    seededPage: page,
  }) => {
    await page
      .getByRole("navigation", { name: "Scale sections" })
      .getByRole("button", { name: "Uses" })
      .click();

    const uses = page.getByRole("region", { name: "Spacing uses" });
    await expect(uses.getByLabel("inset-container name")).toHaveValue(
      "Container inset",
    );
    await expect(uses.getByLabel("gap-section name")).toHaveValue(
      "Section gap",
    );
    await expect(uses.getByLabel("radius-surface name")).toHaveCount(0);
    await expect(
      page.getByRole("region", { name: "Generated spacing steps" }),
    ).toHaveCount(0);
  });

  test("Radius Uses lists surface radius, not inset", async ({
    seededPage: page,
  }) => {
    await showScaleView(page, "Radius");
    await expect(
      page.getByRole("region", { name: "Radius canvas" }),
    ).toBeVisible();
    await page
      .getByRole("navigation", { name: "Scale sections" })
      .getByRole("button", { name: "Uses" })
      .click();
    await expect(
      page.getByRole("region", { name: "Radius uses" }),
    ).toBeVisible();

    const uses = page.getByRole("region", { name: "Radius uses" });
    await expect(uses.getByLabel("radius-surface name")).toHaveValue(
      "Surface radius",
    );
    await expect(uses.getByLabel("inset-container name")).toHaveCount(0);
  });

  test("adds a use, renames it, and keeps it across a reload", async ({
    seededPage: page,
  }) => {
    const uses = await openSpacingUses(page);
    await uses.getByRole("button", { name: "Add use" }).click();
    const field = uses.getByLabel("new-use name");
    await field.fill("Hero inset");
    await field.press("Enter");

    await expect(uses.getByText("--hero-inset", { exact: true })).toBeVisible();

    await page.reload();
    await expect(page.getByLabel("Project name")).toHaveValue(
      defaultProject().name,
    );
    const after = await openSpacingUses(page);
    await expect(
      after.getByText("--hero-inset", { exact: true }),
    ).toBeVisible();

    const stored = await page.evaluate(
      (key) => window.localStorage.getItem(key),
      WORKSPACE_STORAGE_KEY,
    );
    expect(stored).not.toBeNull();
    expect(
      JSON.parse(stored!).layout.map((token: { id: string }) => token.id),
    ).toContain("hero-inset");
  });

  test("duplicates and deletes a spacing use", async ({ seededPage: page }) => {
    const uses = await openSpacingUses(page);
    await uses
      .getByRole("button", { name: "Actions for Container inset" })
      .click();
    await page.getByRole("menuitem", { name: "Duplicate" }).click();
    await expect(
      uses.getByText("--inset-container-copy", { exact: true }),
    ).toBeVisible();

    await uses
      .getByRole("button", { name: "Actions for Container inset copy" })
      .click();
    await page.getByRole("menuitem", { name: "Delete" }).click();
    await expect(
      uses.getByText("--inset-container-copy", { exact: true }),
    ).toHaveCount(0);
    await expect(
      uses.getByText("--inset-container", { exact: true }),
    ).toBeVisible();
  });

  test("dragging a row body reorders spacing uses", async ({
    seededPage: page,
  }) => {
    const uses = await openSpacingUses(page);
    await dragRowBody(
      page,
      uses.locator('tr:has([data-token="gap-section"]) code'),
      uses.locator('tr:has([data-token="inset-container"]) code'),
    );
    await expect
      .poll(() => rowIds(uses))
      .toEqual(["gap-section", "inset-container"]);
  });

  test("cell fields bind a spacing step or a typed px", async ({
    seededPage: page,
  }) => {
    const uses = await openSpacingUses(page);
    const phone = uses.getByLabel("Container inset on Phone");
    await phone.click();
    const listbox = page.getByRole("listbox", { name: "Spacing steps" });
    await expect(listbox.getByRole("option").first()).toBeVisible();
    await expect(listbox.getByText("16px", { exact: true })).toBeVisible();

    await uses
      .getByRole("cell", { name: "Container inset on Phone" })
      .getByLabel("Custom number")
      .click();
    await page.keyboard.type("20");
    await expect(phone).toHaveValue("20");
    await phone.blur();

    const stored = await page.evaluate(
      (key) => window.localStorage.getItem(key),
      WORKSPACE_STORAGE_KEY,
    );
    expect(stored).not.toBeNull();
    const inset = JSON.parse(stored!).layout.find(
      (token: { id: string }) => token.id === "inset-container",
    );
    expect(inset.byDevice.phone).toBe("20px");
  });

  test("Ctrl+Z in a cell undoes the layout edit, not the typed digits", async ({
    seededPage: page,
  }) => {
    const uses = await openSpacingUses(page);
    const phone = uses.getByLabel("Container inset on Phone");
    await uses
      .getByRole("cell", { name: "Container inset on Phone" })
      .getByLabel("Custom number")
      .click();
    await page.keyboard.type("20");
    await phone.blur();
    await expect(phone).toHaveValue("20");

    await phone.focus();
    await page.keyboard.press("ControlOrMeta+z");
    await expect(phone).toContainText("4");

    await expect
      .poll(async () => {
        const stored = await page.evaluate(
          (key) => window.localStorage.getItem(key),
          WORKSPACE_STORAGE_KEY,
        );
        const inset = stored
          ? JSON.parse(stored).layout.find(
              (token: { id: string }) => token.id === "inset-container",
            )
          : null;
        return inset?.byDevice.phone;
      })
      .toBe("4");
  });
});

async function openSpacingUses(page: Page): Promise<Locator> {
  await page
    .getByRole("navigation", { name: "Scale sections" })
    .getByRole("button", { name: "Uses" })
    .click();
  const uses = page.getByRole("region", { name: "Spacing uses" });
  await expect(uses).toBeVisible();
  return uses;
}

function rowIds(uses: Locator) {
  return uses
    .locator("[data-layout-token]")
    .evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("data-layout-token")),
    );
}

async function dragRowBody(
  page: Page,
  from: Locator,
  to: Locator,
): Promise<void> {
  const start = await from.boundingBox();
  const end = await to.boundingBox();
  if (!start || !end) throw new Error("Expected row body to be visible");
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, {
    steps: 12,
  });
  await page.mouse.up();
}
