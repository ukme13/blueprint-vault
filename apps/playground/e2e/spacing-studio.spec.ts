import { readFileSync } from "node:fs";
import type { Locator, Page } from "@playwright/test";
import { defaultProject, readStoredWorkspace } from "./fixtures";
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
      .poll(async () => (await readStoredWorkspace(page))?.spacing?.steps)
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
      .poll(async () => (await readStoredWorkspace(page))?.spacing?.density)
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
      .poll(async () => (await readStoredWorkspace(page))?.radius?.multiplier)
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
      .poll(async () => {
        const tokens = (await readStoredWorkspace(page))?.radius?.tokens as
          Array<{ id: string; unlinkedPx?: number }> | undefined;
        return tokens?.find((token) => token.id === "element")?.unlinkedPx;
      })
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
    const adjustments = page.getByRole("group", { name: "Low adjustments" });
    await adjustments.getByRole("radio", { name: "Light" }).click();
    const opacity = adjustments.getByRole("slider", { name: "Opacity" });
    await opacity.focus();
    await opacity.press("ArrowRight");

    /* Low's light seed is 0.1 on both layers; one step is 0.01, on both. */
    await expect
      .poll(async () => {
        const stored = await readStoredWorkspace(page);
        return stored?.elevation?.levels
          .find((level: { id: string }) => level.id === "low")
          ?.layers.map((layer: { opacity: { light: number } }) =>
            Number(layer.opacity.light.toFixed(2)),
          );
      })
      .toEqual([0.11, 0.11]);

    await page.reload();
    await showScaleView(page, "Elevation");
    await expect(
      page
        .getByRole("region", { name: "Elevation" })
        .getByLabel("Low on light"),
    ).toBeVisible();
  });

  test("edits one level at a time, and adds and removes custom ones", async ({
    seededPage: page,
  }) => {
    await showScaleView(page, "Elevation");
    const canvas = page.getByRole("region", { name: "Elevation", exact: true });
    await expect(canvas).toBeVisible();

    /* Low is picked at first, and only its adjustments are in the inspector. */
    await expect(
      page.getByRole("group", { name: "Low adjustments" }),
    ).toBeVisible();
    await expect(
      page.getByRole("group", { name: "High adjustments" }),
    ).toHaveCount(0);

    /* Picking a row moves the inspector to it. */
    await canvas.locator('[data-elevation-level="med"]').click();
    await expect(
      page.getByRole("group", { name: "Medium adjustments" }),
    ).toBeVisible();
    await expect(
      page.getByRole("group", { name: "Low adjustments" }),
    ).toHaveCount(0);

    /* The system levels have no delete. */
    await expect(canvas.getByRole("button", { name: /^Delete / })).toHaveCount(
      0,
    );

    /* A new level is added, picked, and exported by its own name. */
    await canvas.getByRole("button", { name: "Add level" }).click();
    await expect(canvas.getByText("--shadow-new-level")).toBeVisible();
    await expect(
      page.getByRole("group", { name: "New level adjustments" }),
    ).toBeVisible();

    /* Renamed from the inspector, its variable follows. */
    const name = page.getByLabel("Level name");
    await name.fill("Float");
    await name.press("Enter");
    await expect(canvas.getByText("--shadow-float")).toBeVisible();
    await expect
      .poll(async () =>
        (await readStoredWorkspace(page))?.elevation?.levels.map(
          (level: { id: string }) => level.id,
        ),
      )
      .toEqual(["low", "med", "high", "float"]);

    /* And removed from its row. */
    await canvas.getByRole("button", { name: "Delete Float" }).click();
    await expect(canvas.getByText("--shadow-float")).toHaveCount(0);
    await expect(
      page.getByRole("group", { name: "Low adjustments" }),
    ).toBeVisible();
  });

  test("moves the cast with Distance, and the contact follows", async ({
    seededPage: page,
  }) => {
    await showScaleView(page, "Elevation");
    /* The inspector shows the picked level only; Low is picked at first. */
    await page
      .getByRole("region", { name: "Elevation" })
      .getByRole("button", { name: "High", exact: true })
      .click();
    const distance = page
      .getByRole("group", { name: "High adjustments" })
      .getByRole("slider", { name: "Distance" });
    await distance.focus();
    await distance.press("End");

    await expect
      .poll(async () => {
        const stored = await readStoredWorkspace(page);
        const high = stored?.elevation?.levels.find(
          (level: { id: string }) => level.id === "high",
        );
        return high?.layers.map(
          (layer: { offsetYPx: number }) => layer.offsetYPx,
        );
      })
      /* The cast goes to Distance's 32px; the contact to a quarter of it,
         so it stays the tight edge. */
      .toEqual([8, 32]);
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

  test("previews each level on a card, a button or a dialog", async ({
    seededPage: page,
  }) => {
    await showScaleView(page, "Elevation");
    const canvas = page.getByRole("region", { name: "Elevation" });
    const sample = canvas.getByLabel("Low on light");
    const shape = () => sample.getAttribute("data-preview");
    const shadow = () =>
      sample.evaluate((node) => getComputedStyle(node).boxShadow);

    await expect.poll(shape).toBe("card");
    const before = await shadow();

    /* Each context is a real shape carrying the same shadow: a button
       element for Button, a framed box for Dialog. */
    await canvas.getByRole("radio", { name: "Button" }).click();
    await expect.poll(shape).toBe("button");
    expect(await sample.evaluate((node) => node.tagName)).toBe("BUTTON");
    await expect.poll(shadow).toBe(before);

    await canvas.getByRole("radio", { name: "Dialog" }).click();
    await expect.poll(shape).toBe("dialog");
    await expect.poll(shadow).toBe(before);
    // Every level switches together, on both grounds.
    await expect(canvas.locator("[data-preview=dialog]")).toHaveCount(6);
  });

  test("copies a level's box-shadow and shows it did", async ({
    seededPage: page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await showScaleView(page, "Elevation");
    const canvas = page.getByRole("region", { name: "Elevation" });
    await canvas.locator("[data-elevation-level=high]").click();

    const copy = canvas.getByRole("button", { name: "Copy CSS for Low" });
    await copy.click();
    await expect(copy).toHaveAttribute("data-copy-result", "copied");

    /* The value is the resolved box-shadow the studio's mode draws. */
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toMatch(/^0px \d+px \d+px 0px rgba\(/);
    expect(copied.split("), ")).toHaveLength(2);

    // Copying does not pick the row it sits in.
    await expect(canvas.locator("[data-elevation-level=high]")).toHaveAttribute(
      "data-selected",
      "true",
    );

    // The tick goes back to a copy icon after a moment.
    await expect(copy).not.toHaveAttribute("data-copy-result", "copied", {
      timeout: 3000,
    });
  });

  test("resets a slider to its preset's value on a double-click", async ({
    seededPage: page,
  }) => {
    await showScaleView(page, "Elevation");
    const adjustments = page.getByRole("group", { name: "Low adjustments" });
    await adjustments.getByRole("radio", { name: "Light" }).click();
    const softness = adjustments.getByRole("slider", {
      name: "Softness",
      exact: true,
    });
    const reset = adjustments
      .locator("[data-adjustment-row]")
      .filter({ hasText: "Softness" })
      .locator("[data-reset]");

    /* Seeded Low is two plain drop shadows, so Standard's sliders and
       Standard's starting values: Softness 12. */
    await softness.focus();
    await softness.press("End");
    await expect(softness).toHaveAttribute("aria-valuenow", "48");
    await reset.dblclick();
    await expect(softness).toHaveAttribute("aria-valuenow", "12");

    /* A level set to Subtle card resets to Subtle card's own, 4. */
    await page.getByRole("button", { name: /^Style preset: / }).click();
    await page
      .getByRole("dialog", { name: "Style presets" })
      .getByRole("button", { name: /^Subtle card:/ })
      .click();
    await softness.focus();
    await softness.press("End");
    await reset.dblclick();
    await expect(softness).toHaveAttribute("aria-valuenow", "4");
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

    await page.getByLabel("Shadow colour", { exact: true }).click();
    await page
      .getByRole("option", { name: "primary 500", exact: true })
      .click();

    await expect
      .poll(async () =>
        channels(
          await sample.evaluate((node) => getComputedStyle(node).boxShadow),
        ),
      )
      .not.toEqual(before);
  });

  test("builds a level layer by layer in Advanced", async ({
    seededPage: page,
  }) => {
    await showScaleView(page, "Elevation");
    const sample = page
      .getByRole("region", { name: "Elevation" })
      .getByLabel("Low on light");
    const shadow = () =>
      sample.evaluate((node) => getComputedStyle(node).boxShadow);
    const layers = page.getByRole("group", { name: "Low layers" });
    const rows = layers.getByRole("button", { name: /^Layer \d+: / });

    await page.getByRole("radio", { name: "Advanced" }).click();
    await expect(rows).toHaveCount(2);

    /* One colour control, not two: in Advanced the default is the first
       choice in each layer's Color list, so the Simple setting is not here. */
    await expect(page.getByLabel("Shadow colour", { exact: true })).toHaveCount(
      0,
    );

    /* The type icon is square and as tall as the two lines beside it. */
    const icon = await rows.first().evaluate((row) => {
      const svg = row
        .querySelector("[class*=elevationLayerIcon]")!
        .getBoundingClientRect();
      const text = row
        .querySelector("[class*=elevationLayerText]")!
        .getBoundingClientRect();
      return { width: svg.width, height: svg.height, text: text.height };
    });
    expect(Math.abs(icon.height - icon.text)).toBeLessThanOrEqual(1);
    expect(Math.abs(icon.width - icon.height)).toBeLessThanOrEqual(1);

    /* The row's button fills the room up to the eye and delete buttons, so
       a short summary like this one is never cut off. It once stopped at its
       popover's wrapper and truncated with space to spare. */
    const summary = await rows.first().evaluate((row) => {
      const line = row.querySelector<HTMLElement>(
        "[class*=elevationLayerSummary]",
      )!;
      const eye = row
        .closest("li")!
        .querySelector("button[aria-label^='Hide']")!
        .getBoundingClientRect();
      return {
        cut: line.scrollWidth > line.clientWidth,
        gap: Math.round(eye.left - row.getBoundingClientRect().right),
      };
    });
    expect(summary.cut).toBe(false);
    expect(summary.gap).toBeLessThanOrEqual(8);

    await layers.getByRole("button", { name: "Add layer" }).click();
    await expect(rows).toHaveCount(3);

    /* A row opens its settings in a popover to the left of the panel, over
       the canvas, the way Figma does. */
    await rows.nth(2).click();
    const third = page.getByRole("dialog", { name: "Layer 3 settings" });
    await expect(third).toBeVisible();
    await expect(
      third.getByLabel("Layer 3 colour", { exact: true }),
    ).toContainText("Default");
    const [popover, row] = [
      (await third.boundingBox())!,
      (await rows.nth(2).boundingBox())!,
    ];
    expect(popover.x + popover.width).toBeLessThanOrEqual(row.x + 1);

    /* One 12px inset from the popover's edge to its content, not the
       surface's padding and a second one of the content's own. */
    const inset = await third.evaluate((dialog) => {
      const content = dialog.querySelector("[class*=layerPopoverHeader]")!;
      const outer = dialog.getBoundingClientRect();
      const inner = content.getBoundingClientRect();
      return Math.round(inner.left - outer.left);
    });
    expect(inset).toBeLessThanOrEqual(13);

    /* Every field inside it, all ending on one right edge. X, Y and the
       opacities once ran past the popover into the panel while Blur and
       Spread stopped short. */
    const groups = await third
      .locator(".astryx-input-group")
      .evaluateAll((nodes) =>
        nodes.map((node) => Math.round(node.getBoundingClientRect().right)),
      );
    // The selector's visible box, not the label's text button inside it.
    const colour = (await third
      .getByLabel("Layer 3 colour", { exact: true })
      .locator("xpath=ancestor::*[contains(@class, 'astryx-selector')][1]")
      .boundingBox())!;
    const rights = [...groups, Math.round(colour.x + colour.width)];
    expect(rights).toHaveLength(7);
    for (const right of rights) {
      expect(right).toBeLessThanOrEqual(popover.x + popover.width);
      expect(right).toBe(rights[0]);
    }

    /* Every control in the popover is md, 32px, and each row's label sits
       level with the first field beside it. */
    const sizes = await third.evaluate((dialog) => {
      const height = (el: Element) =>
        Math.round(el.getBoundingClientRect().height);
      const top = (el: Element) => Math.round(el.getBoundingClientRect().top);
      const groups = [...dialog.querySelectorAll(".astryx-input-group")];
      const labels = [...dialog.querySelectorAll("[class*=layerPopoverLabel]")];
      return {
        groups: groups.map(height),
        labels: labels.map(height),
        firstRow: [top(labels[0]!), top(groups[0]!)],
      };
    });
    expect(new Set(sizes.groups)).toEqual(new Set([32]));
    expect(new Set(sizes.labels)).toEqual(new Set([32]));
    expect(sizes.firstRow[0]).toBe(sizes.firstRow[1]);

    /* X, Y, Blur and Spread's tags are one width, so their values line up. */
    const tags = await third
      .locator(".astryx-input-group")
      .evaluateAll((groups) =>
        groups
          .slice(0, 4)
          .map((group) =>
            Math.round(
              group
                .querySelector(".astryx-input-group-text")!
                .getBoundingClientRect().width,
            ),
          ),
      );
    expect(new Set(tags).size).toBe(1);

    // And Light and Dark's, so the two opacities line up too.
    const modeTags = await third
      .locator(".astryx-input-group")
      .evaluateAll((groups) =>
        groups
          .slice(4)
          .map((group) =>
            Math.round(
              group
                .querySelector(".astryx-input-group-text")!
                .getBoundingClientRect().width,
            ),
          ),
      );
    expect(modeTags).toHaveLength(2);
    expect(new Set(modeTags).size).toBe(1);

    /* The row's icon casts a real shadow the way the layer does, as Figma's
       does: a new layer is pushed down, so its square casts below itself. */
    const iconShadow = () =>
      rows
        .nth(2)
        .locator("[data-shadow-icon]")
        .evaluate((node) => getComputedStyle(node).boxShadow);
    await expect.poll(iconShadow).toMatch(/ 0px 2px 0px 0px$/);
    await expect.poll(iconShadow).not.toContain("inset");

    await third.getByLabel("Layer 3 type", { exact: true }).click();
    await page.getByRole("option", { name: "Inner shadow" }).click();
    await expect.poll(shadow).toContain("inset");
    // An inner layer's icon casts inset, which shows along the top inside.
    await expect.poll(iconShadow).toMatch(/ 0px 2px 0px 0px inset$/);
    await third.getByRole("spinbutton", { name: "Layer 3 Blur" }).fill("12");
    await third
      .getByRole("spinbutton", { name: "Layer 3 Blur" })
      .press("Enter");
    await expect(rows.nth(2)).toHaveAccessibleName(
      /^Layer 3: Inner shadow, X 0 · Y 4 · B 12/,
    );

    await third.getByRole("button", { name: "Close Layer 3 settings" }).click();
    await expect(third).toBeHidden();

    await layers.getByRole("button", { name: "Hide Layer 3" }).click();
    await expect.poll(shadow).not.toContain("inset");
    await expect
      .poll(async () => {
        const stored = await readStoredWorkspace(page);
        return stored?.elevation?.levels.find(
          (level: { id: string }) => level.id === "low",
        )?.layers[2];
      })
      .toMatchObject({ type: "inner", hidden: true });

    await layers.getByRole("button", { name: "Delete Layer 3" }).click();
    await expect(rows).toHaveCount(2);
  });

  test("applies a preset, and hands a custom stack to Advanced", async ({
    seededPage: page,
  }) => {
    await showScaleView(page, "Elevation");
    const sample = page
      .getByRole("region", { name: "Elevation" })
      .getByLabel("Low on light");
    const presets = page.getByRole("group", { name: "Low presets" });

    /* Colour, presets and pads are one group, with no divider between them:
       all three set how this level's shadow looks. */
    const simple = page.getByRole("group", { name: "Low simple" });
    await expect(
      simple.getByLabel("Shadow colour", { exact: true }),
    ).toHaveCount(1);
    await expect(
      simple.getByRole("group", { name: "Low presets" }),
    ).toBeVisible();
    await expect(
      simple.getByRole("group", { name: "Low adjustments" }),
    ).toBeVisible();
    const dividers = await simple.evaluate((group) =>
      [...group.querySelectorAll<HTMLElement>(":scope > *")].map(
        (part) => getComputedStyle(part).borderBottomWidth,
      ),
    );
    expect(dividers.every((width) => width === "0px")).toBe(true);
    /* Simple's adjustments: one Lightroom-style slider row each. */
    const adjustments = page.getByRole("group", { name: "Low adjustments" });
    const slider = (name: string) =>
      adjustments.getByRole("slider", { name, exact: true });
    const rowNames = () =>
      adjustments.locator("[data-adjustment-row] [class*=sliderRowLabel]");
    const drawn = () =>
      sample.evaluate((node) => getComputedStyle(node).boxShadow);
    const slideTo = async (name: string, key: "End" | "Home") => {
      await slider(name).focus();
      await slider(name).press(key);
    };
    await adjustments.getByRole("radio", { name: "Light" }).click();

    /* The preset comes first in Simple, above the colour. */
    const order = await simple.evaluate((group) =>
      [...group.querySelectorAll(":scope > [role=group], :scope > div")].map(
        (part) => part.getAttribute("aria-label") ?? "colour",
      ),
    );
    expect(order.slice(0, 2)).toEqual(["Low presets", "colour"]);

    /* A compact trigger: the seeded level is no preset, so Custom, with a
       live thumbnail of its own shadow. */
    const trigger = presets.getByRole("button", { name: /^Style preset: / });
    await expect(trigger).toHaveAccessibleName("Style preset: Custom");

    /* A hero row, not a one-line field: 52 to 56px tall, a square tile in
       its thumbnail, and a second line that says what it does. */
    const hero = await trigger.evaluate((button) => {
      const tile = button
        .querySelector("[data-preset-thumbnail]")!
        .getBoundingClientRect();
      return {
        height: button.getBoundingClientRect().height,
        tile: { width: tile.width, height: tile.height },
      };
    });
    expect(hero.height).toBeGreaterThanOrEqual(52);
    expect(hero.height).toBeLessThanOrEqual(56);
    expect(hero.tile.width).toBe(hero.tile.height);
    await expect(trigger).toContainText("Click to change preset");
    await expect
      .poll(() =>
        trigger
          .locator("[data-preset-thumbnail]")
          .evaluate((node) => getComputedStyle(node).boxShadow),
      )
      .not.toBe("none");

    /* It opens the presets as cards to the left of the panel, as a layer's
       settings do, each previewing its real shadow. */
    const dialog = page.getByRole("dialog", { name: "Style presets" });
    /* Reopened with a retry, as elsewhere in these tests: a click in the
       moment the last one is still closing is ignored, and no hand is that
       fast. A selector that never opens still fails here. */
    const open = async () => {
      await expect(async () => {
        await trigger.click();
        await expect(dialog).toBeVisible({ timeout: 1000 });
      }).toPass({ timeout: 5000 });
    };
    const pick = async (name: string) => {
      await open();
      await dialog
        .getByRole("button", { name: new RegExp(`^${name}:`) })
        .click();
      // Picking one closes it.
      await expect(dialog).toBeHidden();
    };
    await open();
    const [panel, button] = [
      (await dialog.boundingBox())!,
      (await trigger.boundingBox())!,
    ];
    expect(panel.x + panel.width).toBeLessThanOrEqual(button.x + 1);
    await expect(dialog.getByRole("button", { name: /:/ })).toHaveCount(5);

    /* Every card's tile is square, with room on all four sides, so a
       shadow casts evenly rather than being squashed or clipped. */
    const tiles = await dialog
      .locator("[data-preset-preview]")
      .evaluateAll((nodes) =>
        nodes.map((node) => {
          const tile = node.getBoundingClientRect();
          const area = node.parentElement!.getBoundingClientRect();
          return {
            width: tile.width,
            height: tile.height,
            room: Math.min(
              tile.top - area.top,
              area.bottom - tile.bottom,
              tile.left - area.left,
              area.right - tile.right,
            ),
          };
        }),
      );
    for (const tile of tiles) {
      expect(tile.width).toBe(tile.height);
      expect(tile.room).toBeGreaterThanOrEqual(16);
    }
    await expect
      .poll(() =>
        dialog
          .locator("[data-preset-preview=inset]")
          .evaluate((node) => getComputedStyle(node).boxShadow),
      )
      .toContain("inset");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    await pick("Inset");
    await expect(trigger).toHaveAccessibleName("Style preset: Inset");
    // A preset's second line is what it is for.
    await expect(trigger).toContainText("Pressed into the page.");
    await expect
      .poll(() => sample.evaluate((node) => getComputedStyle(node).boxShadow))
      .toContain("inset");

    /* Inset's sliders: Depth, Softness, Opacity. Pressed to its deepest,
       it stays inset and stays Inset. */
    await expect(rowNames()).toHaveText(["Depth", "Softness", "Opacity"]);
    await slideTo("Depth", "End");
    await expect.poll(drawn).toMatch(/0px 24px/);
    await expect.poll(drawn).toContain("inset");
    await expect(trigger).toHaveAccessibleName("Style preset: Inset");

    /* Standard's sliders: Distance, Softness, Spread, Opacity. Its card is
       the active one next time. */
    await pick("Standard");
    await expect(rowNames()).toHaveText([
      "Distance",
      "Softness",
      "Spread",
      "Opacity",
    ]);
    await open();
    await expect(
      dialog.getByRole("button", { name: /^Standard:/ }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("Escape");

    /* Neumorphic's: Distance moves shadow and highlight apart together;
       Highlight and Shadow set each one's strength for the mode. */
    await pick("Neumorphic");
    await expect(rowNames()).toHaveText([
      "Distance",
      "Softness",
      "Highlight",
      "Shadow",
    ]);
    await slideTo("Distance", "End");
    await expect.poll(drawn).toContain("20px 20px");
    await expect.poll(drawn).toContain("-20px -20px");
    const highlightBefore =
      await slider("Highlight").getAttribute("aria-valuenow");
    await slider("Highlight").focus();
    await slider("Highlight").press("ArrowLeft");
    await expect(slider("Highlight")).not.toHaveAttribute(
      "aria-valuenow",
      highlightBefore!,
    );
    await expect(trigger).toHaveAccessibleName("Style preset: Neumorphic");

    await pick("Glow");

    /* Glow has a colour of its own, so the colour control shows that one,
       named for the level, rather than the shared shadow colour: no black
       swatch beside a pink glow. */
    const levelColour = page.getByLabel("Low colour", { exact: true });
    await expect(levelColour).toContainText("primary");
    await expect(levelColour).not.toContainText("950");
    await expect(page.getByLabel("Shadow colour", { exact: true })).toHaveCount(
      0,
    );

    /* Changing it recolours this glow, and only this level. */
    const channels = (node: Element) =>
      [...getComputedStyle(node).boxShadow.matchAll(/rgba?\((\d+, \d+, \d+)/g)]
        .map((m) => m[1])
        .join(" ");
    const canvas = page.getByRole("region", { name: "Elevation" });
    const medium = await canvas
      .getByLabel("Medium on light")
      .evaluate(channels);
    const before = await sample.evaluate(channels);
    await levelColour.click();
    await page
      .getByRole("option", { name: "primary 300", exact: true })
      .click();
    await expect.poll(() => sample.evaluate(channels)).not.toBe(before);
    await expect(levelColour).toContainText("primary 300");
    expect(await canvas.getByLabel("Medium on light").evaluate(channels)).toBe(
      medium,
    );
    // Still a Glow, in its new colour.
    await expect(trigger).toHaveAccessibleName("Style preset: Glow");

    /* Glow's: Radius, Spread, Intensity. */
    await expect(rowNames()).toHaveText(["Radius", "Spread", "Intensity"]);
    await slideTo("Radius", "End");
    await expect.poll(drawn).toMatch(/0px 0px 48px/);
    await slideTo("Spread", "End");
    await expect.poll(drawn).toMatch(/0px 0px 48px 24px/);
    await slideTo("Intensity", "Home");
    await expect(slider("Intensity")).toHaveAttribute("aria-valuenow", "0");
    await expect(trigger).toHaveAccessibleName("Style preset: Glow");

    // The Simple / Advanced switch is md, 32px, like every control here.
    expect(
      Math.round(
        (await page
          .getByRole("radiogroup", { name: "Elevation editor" })
          .boundingBox())!.height,
      ),
    ).toBe(32);
    // And every slider row is one 32px line.
    const rowHeights = await adjustments
      .locator("[data-adjustment-row]")
      .evaluateAll((rows) =>
        rows.map((row) => Math.round(row.getBoundingClientRect().height)),
      );
    expect(new Set(rowHeights)).toEqual(new Set([32]));
    // No note or button stands in for the sliders; the switch goes to Advanced.
    await expect(
      page.getByRole("button", { name: "Edit layers in Advanced" }),
    ).toHaveCount(0);
    await page.getByRole("radio", { name: "Advanced" }).click();
    await expect(
      page
        .getByRole("group", { name: "Low layers" })
        .getByRole("button", { name: /^Layer \d+: Drop shadow/ }),
    ).toHaveCount(2);
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
    await expect(
      uses.locator('[data-token="inset-container"] [data-system-use]'),
    ).toHaveText("Container inset");
    await expect(
      uses.locator('[data-token="gap-section"] [data-system-use]'),
    ).toHaveText("Section gap");
    await expect(uses.locator('[data-token="radius-surface"]')).toHaveCount(0);
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
    await expect(
      uses.locator('[data-token="radius-surface"] [data-system-use]'),
    ).toHaveText("Surface radius");
    await expect(uses.locator('[data-token="inset-container"]')).toHaveCount(0);
  });

  test("Radius Uses gives buttons, inputs and chips their own corner", async ({
    seededPage: page,
  }) => {
    await showScaleView(page, "Radius");
    /* The Radius page, loaded, before its tabs are clicked. */
    await expect(
      page.getByRole("region", { name: "Radius canvas" }),
    ).toBeVisible();
    await page
      .getByRole("navigation", { name: "Scale sections" })
      .getByRole("button", { name: "Uses" })
      .click();
    const uses = page.getByRole("region", { name: "Radius uses" });
    await expect(
      uses.locator('[data-token="radius-button"] [data-system-use]'),
    ).toHaveText("Button radius");
    await expect(
      uses.locator('[data-token="radius-input"] [data-system-use]'),
    ).toHaveText("Input radius");
    await expect(
      uses.locator('[data-token="radius-chip"] [data-system-use]'),
    ).toHaveText("Chip radius");

    /* A pill button on Desktop. The Preview tab shows it beside an input
       that keeps its corner and a card on Surface radius. */
    await uses.getByLabel("Button radius on Desktop").click();
    await page
      .getByRole("listbox", { name: "Radius tokens" })
      .getByRole("option", { name: /^Full/ })
      .click();

    await page
      .getByRole("navigation", { name: "Scale sections" })
      .getByRole("button", { name: "Preview" })
      .click();
    const card = page.getByRole("article", { name: "Verba AI Preview" });
    await expect(card).toBeVisible();
    const radiusOf = (id: string) =>
      page
        .locator(`[data-radius-sample="${id}"]`)
        .first()
        .evaluate((node) => getComputedStyle(node).borderRadius);

    await expect.poll(() => radiusOf("radius-button")).toBe("9999px");
    await expect.poll(() => radiusOf("radius-input")).toBe("8px");
    /* A text button, which Full turns into a pill rather than a circle. */
    await expect
      .poll(() =>
        card
          .getByRole("button", { name: "Ask", exact: true })
          .evaluate((node) => getComputedStyle(node).borderRadius),
      )
      .toBe("9999px");
    /* In the project's colours, not the studio's: the card's primary is
       scoped over the studio's own. */
    const primaries = await card.evaluate((node) => ({
      card: getComputedStyle(node)
        .getPropertyValue("--color-action-primary")
        .trim(),
      studio: getComputedStyle(document.documentElement)
        .getPropertyValue("--color-action-primary")
        .trim(),
    }));
    expect(primaries.card).not.toBe("");
    expect(primaries.card).not.toBe(primaries.studio);
    /* And in the project's type, on the text itself: Astryx's theme sets
       h1-h6 and p by its own font variables, so a card set in the project's
       font can still show its title and subtitle in the studio's Inter. */
    const faces = await card.evaluate((node) => {
      const first = (element: Element, property = "font-family") =>
        getComputedStyle(element)
          .getPropertyValue(property)
          .split(",")[0]!
          .trim()
          .replace(/^["']|["']$/g, "");
      return {
        main: first(node, "--font-family-main"),
        title: first(node.querySelector("h2")!),
        subtitle: first(node.querySelector("p")!),
        chip: first(node.querySelector('[data-radius-sample="radius-chip"]')!),
      };
    });
    expect(faces.main).not.toBe("");
    expect(faces).toEqual({
      main: faces.main,
      title: faces.main,
      subtitle: faces.main,
      chip: faces.main,
    });
    await expect.poll(() => radiusOf("radius-chip")).toBe("4px");
    /* Surface is page on Desktop and container on Phone. */
    await expect.poll(() => radiusOf("radius-surface")).toBe("28px");

    await page
      .getByRole("navigation", { name: "Preview devices" })
      .getByRole("button", { name: "Phone" })
      .click();
    await expect.poll(() => radiusOf("radius-surface")).toBe("12px");
    await expect.poll(() => radiusOf("radius-button")).toBe("8px");

    /* A chip fills the field. */
    await page.getByRole("button", { name: "Translate" }).click();
    await expect(page.getByLabel("Ask something")).toHaveValue("Translate");
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

    const stored = await readStoredWorkspace(page);
    expect(stored).not.toBeNull();
    expect(stored.layout.map((token: { id: string }) => token.id)).toContain(
      "hero-inset",
    );
  });

  test("duplicates and deletes a custom spacing use", async ({
    seededPage: page,
  }) => {
    const uses = await openSpacingUses(page);
    await uses.getByRole("button", { name: "Add use" }).click();
    const field = uses.getByLabel("new-use name");
    await field.fill("Hero inset");
    await field.press("Enter");

    await uses.getByRole("button", { name: "Actions for Hero inset" }).click();
    await page.getByRole("menuitem", { name: "Duplicate" }).click();
    await expect(
      uses.getByText("--hero-inset-copy", { exact: true }),
    ).toBeVisible();

    await uses
      .getByRole("button", { name: "Actions for Hero inset copy" })
      .click();
    await page.getByRole("menuitem", { name: "Delete" }).click();
    await expect(
      uses.getByText("--hero-inset-copy", { exact: true }),
    ).toHaveCount(0);
    await expect(uses.getByText("--hero-inset", { exact: true })).toBeVisible();
  });

  test("keeps a built-in use's name, and resets it instead of deleting", async ({
    seededPage: page,
  }) => {
    const uses = await openSpacingUses(page);
    /* A label, not a field. */
    await expect(uses.getByLabel("gap-section name")).toHaveCount(0);
    await expect(
      uses.locator('[data-token="gap-section"] [data-system-use]'),
    ).toHaveText("Section gap");

    /* Retarget it, then put it back from its menu, which offers nothing
       else. */
    const phone = uses.getByLabel("Section gap on Phone");
    await phone.click();
    await page
      .getByRole("listbox", { name: "Spacing steps" })
      .getByRole("option")
      .first()
      .click();
    await uses.getByRole("button", { name: "Actions for Section gap" }).click();
    await expect(page.getByRole("menuitem")).toHaveText(["Reset to default"]);
    await page.getByRole("menuitem", { name: "Reset to default" }).click();

    await expect
      .poll(async () => {
        const stored = await readStoredWorkspace(page);
        return stored?.layout.find(
          (token: { id: string }) => token.id === "gap-section",
        )?.byDevice.phone;
      })
      .toBe("16");

    /* A new use cannot take its name, in any case or order. */
    await uses.getByRole("button", { name: "Add use" }).click();
    const field = uses.getByLabel("new-use name");
    await field.fill("GAP section");
    await field.press("Enter");
    await expect(
      uses.getByText("--gap-section-2", { exact: true }),
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

    const stored = await readStoredWorkspace(page);
    expect(stored).not.toBeNull();
    const inset = stored.layout.find(
      (token: { id: string }) => token.id === "inset-container",
    );
    expect(inset.byDevice.phone).toBe("20px");
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
