import { readFileSync } from "node:fs";
import type { Locator, Page } from "@playwright/test";
import { defaultProject, readStoredWorkspace } from "./fixtures";
import {
  expect,
  clippedValues,
  showScaleView,
  spacingTagReport,
  test,
} from "./scale-fixtures";
import { fillHybridNumber } from "./typography-fixtures";

/**
 * The spacing scale, edited.
 *
 * See docs/roadmap/scale-studio.md. That the preview page reaches for no
 * hardcoded measurement is checked at the source, in packages/ui; this covers
 * the scale being editable and surviving a reload.
 */

test.describe("The spacing studio", () => {
  test("shows the seeded scale in px, or in rem from the unit switch", async ({
    seededPage: page,
  }) => {
    const steps = page.getByRole("region", { name: "Generated spacing steps" });
    const value = steps
      .locator('[data-spacing-step="4"]')
      .locator("[data-spacing-value]");
    const unit = steps.getByRole("radiogroup", { name: "Value unit" });
    /* 4px base: step 4 is 16px, which is 1rem against the browser root rather
       than against the type scale's own base. One column, in one unit. */
    await expect(value).toHaveText("16px");
    await expect(steps.getByText("1rem", { exact: true })).toHaveCount(0);

    await unit.getByRole("radio", { name: "rem" }).click();
    await expect(value).toHaveText("1rem");
    // The longest, 0.125rem, fits whole in the inspector.
    expect(await clippedValues(steps)).toEqual([]);
    await expect(steps.getByText("16px", { exact: true })).toHaveCount(0);

    await unit.getByRole("radio", { name: "px" }).click();
    await expect(value).toHaveText("16px");
  });

  test("sets inset, stack and columns on steps of their own", async ({
    seededPage: page,
  }) => {
    const preview = page.getByRole("figure", { name: "Spacing preview" });
    /* The first of each kind of space: its padding, height or width. */
    const measure = () =>
      preview.evaluate((figure) => {
        const zone = (slot: string) =>
          figure.querySelector<HTMLElement>(`[data-spacing-zone="${slot}"]`)!;
        return {
          inset: getComputedStyle(zone("inset")).paddingTop,
          stack: Math.round(zone("stack").getBoundingClientRect().height),
          columns: Math.round(zone("columns").getBoundingClientRect().width),
        };
      });

    /* Two real cards, each padded, stacked and set apart on its own step:
       24px, 8px and 16px to start. */
    await expect(
      preview.getByRole("heading", { name: "Let’s get you settled in." }),
    ).toBeVisible();
    await expect(
      preview.getByRole("button", { name: "Save profile" }),
    ).toBeVisible();
    // The welcome card carries the real wordmark.
    await expect(preview.getByRole("img", { name: "Blueprint" })).toBeVisible();
    await expect
      .poll(measure)
      .toEqual({ inset: "24px", stack: 8, columns: 16 });

    // Each slot's icon is 20px.
    const iconSizes = await page
      .locator("[data-spacing-slot] svg[class*=spacingSlotIcon]")
      .evaluateAll((icons) =>
        icons.map((icon) => {
          const box = icon.getBoundingClientRect();
          return [Math.round(box.width), Math.round(box.height)];
        }),
      );
    expect(iconSizes).toEqual([
      [20, 20],
      [20, 20],
      [20, 20],
    ]);

    // Padding and gaps are hatched on the diagonal, as Figma marks them.
    const hatching = await preview.evaluate((figure) =>
      ["inset", "stack", "columns"].map(
        (slot) =>
          getComputedStyle(
            figure.querySelector(`[data-spacing-zone="${slot}"]`)!,
          ).backgroundImage,
      ),
    );
    for (const image of hatching) {
      expect(image).toContain("repeating-linear-gradient");
    }
    /* Both cards sit inside the preview, side by side, sharing its width:
       long text wraps rather than widening a card and pushing the other
       out. */
    const fit = await preview.evaluate((figure) => {
      const box = figure.getBoundingClientRect();
      const cards = [
        ...figure.querySelectorAll('[data-spacing-zone="inset"]'),
      ].map((card) => card.getBoundingClientRect());
      return {
        inside: cards.every(
          (card) => card.left >= box.left && card.right <= box.right + 0.5,
        ),
        sideBySide: cards[1]!.left >= cards[0]!.right,
        overflow: figure.scrollWidth - figure.clientWidth,
      };
    });
    expect(fit).toEqual({ inside: true, sideBySide: true, overflow: 0 });

    /* On a wide canvas the cards stop at 420px and sit centred. */
    await page.setViewportSize({ width: 2400, height: 900 });
    const wide = () =>
      preview.evaluate((figure) => {
        const box = figure
          .querySelector("[class*=spacingCards]")!
          .getBoundingClientRect();
        const cards = [
          ...figure.querySelectorAll('[data-spacing-zone="inset"]'),
        ].map((card) => card.getBoundingClientRect());
        const left = cards[0]!.left - box.left;
        const right = box.right - cards[cards.length - 1]!.right;
        return {
          widths: cards.map((card) => Math.round(card.width)),
          centred: Math.abs(left - right) <= 1 && left > 0,
        };
      });
    await expect.poll(wide).toEqual({ widths: [420, 420], centred: true });

    // A stack gap runs the card body's full width, so its stripes show.
    const stackBand = await preview.evaluate((figure) => {
      const band = figure.querySelector('[data-spacing-zone="stack"]')!;
      return [
        Math.round(band.getBoundingClientRect().width),
        Math.round(band.parentElement!.getBoundingClientRect().width),
      ];
    });
    expect(stackBand[0]).toBe(stackBand[1]);

    /* Each selector moves its own space and nothing else. */
    await page.getByLabel("Stack spacing", { exact: true }).click();
    await page.getByRole("option", { name: /^12px/ }).click();
    await expect
      .poll(measure)
      .toEqual({ inset: "24px", stack: 12, columns: 16 });
    await expect(
      page.getByLabel("Stack spacing", { exact: true }),
    ).toContainText("Stack: 12px");

    await page.getByLabel("Columns spacing", { exact: true }).click();
    await page.getByRole("option", { name: /^32px/ }).click();
    await expect
      .poll(measure)
      .toEqual({ inset: "24px", stack: 12, columns: 32 });
  });

  test("keeps every size tag clear of the cards’ content", async ({
    seededPage: page,
  }) => {
    const preview = page.getByRole("figure", { name: "Spacing preview" });
    /* A tag never sits on text or a control: a stack gap thinner than its
       tag once put the tag over the paragraph and the button beside it. */
    const collisions = () => spacingTagReport(preview);

    await expect.poll(async () => (await collisions()).tags).toBeGreaterThan(3);
    /* Two stack tags, under the title and above the action: the rhythm,
       without a column of the same size down the card. */
    await expect(preview.locator('[data-spacing-tag="stack"]')).toHaveCount(2);
    expect((await collisions()).hits).toEqual([]);

    /* And with the thinnest stack gap and the tightest inset. */
    await page.getByLabel("Stack spacing", { exact: true }).click();
    await page.getByRole("option", { name: /^2px/ }).click();
    await page.getByLabel("Inset spacing", { exact: true }).click();
    await page.getByRole("option", { name: /^4px/ }).click();
    await expect.poll(async () => (await collisions()).hits).toEqual([]);
  });

  test("keeps the preview slots, marks and unit across a page switch", async ({
    seededPage: page,
  }) => {
    const workspaces = page.getByRole("navigation", {
      name: "Blueprint workspaces",
    });
    const inset = page.getByLabel("Inset spacing", { exact: true });
    const stack = page.getByLabel("Stack spacing", { exact: true });
    const marks = page.getByRole("switch", { name: "Show spacing" });
    const rem = page
      .getByRole("radiogroup", { name: "Value unit" })
      .getByRole("radio", { name: "rem" });
    const undo = page.getByRole("button", { name: "Undo" });

    await expect(undo).toBeDisabled();
    await inset.click();
    await page.getByRole("option", { name: /^32px/ }).click();
    await stack.click();
    await page.getByRole("option", { name: /^12px/ }).click();
    await marks.click();
    await rem.click();
    // A view setting, not an edit: nothing to undo.
    await expect(undo).toBeDisabled();

    /* To the colour studio and back, the way somebody would. */
    await workspaces.getByRole("link", { name: "Colour" }).click();
    await expect(page).toHaveURL(/colour$/);
    await workspaces
      .getByRole("link", { name: "Spacing", exact: true })
      .click();

    await expect(inset).toContainText("Inset: 32px");
    await expect(stack).toContainText("Stack: 12px");
    await expect(marks).not.toBeChecked();
    await expect(rem).toBeChecked();
    await expect(
      page
        .getByRole("region", { name: "Generated spacing steps" })
        .locator('[data-spacing-step="4"] [data-spacing-value]'),
    ).toHaveText("1rem");

    /* And across a reload. */
    await page.reload();
    await expect(inset).toContainText("Inset: 32px");
    await expect(rem).toBeChecked();
  });

  test("picks a base unit from Figma-style presets, by search and keys", async ({
    seededPage: page,
  }) => {
    const chip = page.locator("[data-hybrid-chip]").first();
    const search = page.getByRole("textbox", { name: "Search presets" });
    const list = page.getByRole("listbox", { name: "Base unit presets" });
    await expect(chip).toContainText("Default");

    await chip.click();
    // The search takes focus as the popover opens: typing filters at once.
    await expect(search).toBeFocused();
    /* Its divider runs edge to edge: the popover has no padding of its own. */
    const edges = await search.evaluate((node) => {
      const row = node.closest("label")!.getBoundingClientRect();
      const popover = node.closest(".astryx-popover") as HTMLElement;
      const box = popover.getBoundingClientRect();
      const border = parseFloat(getComputedStyle(popover).borderLeftWidth);
      return [
        Math.round(row.left - box.left - border),
        Math.round(box.right - row.right - border),
      ];
    });
    expect(edges).toEqual([0, 0]);
    /* A borderless search row, a sentence-case heading. */
    expect(
      await search.evaluate((node) => getComputedStyle(node).borderTopWidth),
    ).toBe("0px");
    await expect(
      page.getByText("Base unit presets", { exact: true }),
    ).toHaveCSS("text-transform", "none");
    /* The picked preset is marked in a neutral tone, not the accent: its
       text is the same colour as the others'. */
    const picked = list.getByRole("option", { selected: true });
    await expect(picked).toContainText("Default");
    const colour = (option: typeof picked) =>
      option.evaluate((node) => getComputedStyle(node).color);
    expect(await colour(picked)).toBe(
      await colour(list.getByRole("option", { name: /Dense/ })),
    );

    /* Search narrows the list; arrows and Enter pick. */
    await search.fill("comf");
    await expect(list.getByRole("option")).toHaveCount(1);
    await search.press("ArrowDown");
    await search.press("Enter");
    await expect(list).toBeHidden();
    await expect(chip).toContainText("Comfortable");

    /* Escape closes and changes nothing. */
    await chip.click();
    await expect(search).toBeFocused();
    await search.press("ArrowDown");
    await search.press("Escape");
    await expect(list).toBeHidden();
    await expect(chip).toContainText("Comfortable");
  });

  test("folds the step list, its unit switch beside the chevron", async ({
    seededPage: page,
  }) => {
    const steps = page.getByRole("region", { name: "Generated spacing steps" });
    const trigger = steps.getByRole("button", { name: "Steps", exact: true });
    const rows = steps.getByRole("listitem");
    const unit = steps.getByRole("radiogroup", { name: "Value unit" });

    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(rows.first()).toBeVisible();
    const label = trigger.locator("[class*=groupTrigger]");
    await expect(label).toHaveCSS("font-size", "14px");
    await expect(label).toHaveCSS("font-weight", "600");

    /* In the header row, left of the chevron and clear of it, centred on
       the row, and not inside the trigger's button. */
    const place = await steps.evaluate((section) => {
      const button = section.querySelector("button[aria-expanded]")!;
      const chevron = button.querySelector("svg")!.getBoundingClientRect();
      const row = button.getBoundingClientRect();
      const group = section.querySelector("[role=radiogroup]")!;
      const box = group.getBoundingClientRect();
      return {
        leftOfChevron: box.right <= chevron.left - 4,
        centred:
          Math.abs(box.top + box.height / 2 - (row.top + row.height / 2)) <= 2,
        outsideButton: group.closest("button") === null,
      };
    });
    expect(place).toEqual({
      leftOfChevron: true,
      centred: true,
      outsideButton: true,
    });

    /* Folded, the list goes and the switch stays, still usable. */
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(rows.first()).toBeHidden();
    await expect(unit).toBeVisible();
    await unit.getByRole("radio", { name: "rem" }).click();
    await expect(unit.getByRole("radio", { name: "rem" })).toBeChecked();

    await trigger.click();
    await expect(
      steps.locator('[data-spacing-step="4"] [data-spacing-value]'),
    ).toHaveText("1rem");
  });

  test("keeps Save profile at the foot of its card", async ({
    seededPage: page,
  }) => {
    /* The welcome card is the taller; the profile card stretches to match,
       and its action belongs at the bottom, not under the last checkmark. */
    const save = page
      .getByRole("figure", { name: "Spacing preview" })
      .getByRole("button", { name: "Save profile" });
    const fit = await save.evaluate((button) => {
      /* The button's block: the child of the card body that holds it. */
      let block: Element = button;
      while (!block.parentElement!.className.includes("spacingCardBody")) {
        block = block.parentElement!;
      }
      const body = block.parentElement!;
      const band = block.previousElementSibling!;
      const bottom = (element: Element) =>
        element.getBoundingClientRect().bottom;
      return {
        atFoot: Math.round(bottom(body) - bottom(button)),
        gapTouches: Math.round(
          button.getBoundingClientRect().top - bottom(band),
        ),
      };
    });
    expect(fit).toEqual({ atFoot: 0, gapTouches: 0 });
  });

  test("hides and shows the spacing marks", async ({ seededPage: page }) => {
    const preview = page.getByRole("figure", { name: "Spacing preview" });
    const marks = () =>
      preview.evaluate((figure) => ({
        tags: figure.querySelectorAll("[data-spacing-tag]").length,
        hatched: [...figure.querySelectorAll("[data-spacing-zone]")].some(
          (zone) => getComputedStyle(zone).backgroundImage !== "none",
        ),
        insetPadding: getComputedStyle(
          figure.querySelector('[data-spacing-zone="inset"]')!,
        ).paddingTop,
      }));
    const toggle = page.getByRole("switch", { name: "Show spacing" });

    await expect(toggle).toBeChecked();
    expect(await marks()).toMatchObject({
      hatched: true,
      insetPadding: "24px",
    });

    /* Off: no tags, no hatching — and the spaces keep their sizes, so the
       cards are the same UI, plain. */
    await toggle.click();
    await expect(toggle).not.toBeChecked();
    await expect
      .poll(marks)
      .toEqual({ tags: 0, hatched: false, insetPadding: "24px" });
    // The card is one fill, padding and all, not a white box on grey.
    const fills = await preview.evaluate((figure) => {
      const card = figure.querySelector('[data-spacing-zone="inset"]')!;
      return [
        getComputedStyle(card).backgroundColor,
        getComputedStyle(card.querySelector("[class*=spacingCardBody]")!)
          .backgroundColor,
      ];
    });
    expect(fills[0]).toBe(fills[1]);

    await toggle.click();
    await expect.poll(async () => (await marks()).tags).toBeGreaterThan(3);
  });

  test("lists the steps in the inspector, beside the preview", async ({
    seededPage: page,
  }) => {
    const canvas = page.getByRole("region", { name: "Spacing canvas" });
    const inspector = page.getByRole("complementary");
    const steps = inspector.getByRole("region", {
      name: "Generated spacing steps",
    });
    const preview = canvas.getByRole("figure", { name: "Spacing preview" });

    /* The canvas is the preview; the list sits under Density. */
    await expect(steps).toBeVisible();
    await expect(
      canvas.getByRole("region", { name: "Generated spacing steps" }),
    ).toHaveCount(0);
    const density = await inspector
      .getByRole("heading", { name: "Density" })
      .boundingBox();
    expect((await steps.boundingBox())!.y).toBeGreaterThan(density!.y);

    /* Every row fits the inspector's width: nothing runs past its edge. */
    const outside = await steps.evaluate((section) => {
      const edge = section.getBoundingClientRect().right;
      return [...section.querySelectorAll("[aria-label^='Keep step']")].filter(
        (box) => box.getBoundingClientRect().right > edge + 0.5,
      ).length;
    });
    expect(outside).toBe(0);

    /* The inspector scrolls on its own; the preview stays where it is. */
    const last = steps.locator("li").last();
    await last.scrollIntoViewIfNeeded();
    await expect(last).toBeInViewport();
    await expect(preview).toBeInViewport();
  });

  test("sets the active slot from the step list", async ({
    seededPage: page,
  }) => {
    const steps = page.getByRole("region", { name: "Generated spacing steps" });
    const row = (step: number) =>
      steps.locator(`[data-spacing-step="${step}"]`);
    const zone = (slot: string) =>
      page.locator(`figure [data-spacing-zone="${slot}"]`).first();
    const insetPadding = () =>
      zone("inset").evaluate((node) => getComputedStyle(node).paddingTop);

    /* Inset is active to start, so its step is the one marked: 6, 24px. */
    await expect(row(6)).toHaveAttribute("data-selected", "true");

    /* A click anywhere on a row sets the active slot. */
    await row(8).getByText("32px", { exact: true }).click();
    await expect(row(8)).toHaveAttribute("data-selected", "true");
    await expect.poll(insetPadding).toBe("32px");

    /* Touching Stack makes it the active slot; the list then sets it, and
       leaves Inset where it was. */
    await page.getByLabel("Stack spacing", { exact: true }).focus();
    await expect(page.locator('[data-spacing-slot="stack"]')).toHaveAttribute(
      "data-active",
      "true",
    );
    await row(1).getByText("4px", { exact: true }).click();
    await expect
      .poll(() =>
        zone("stack").evaluate((node) =>
          Math.round(node.getBoundingClientRect().height),
        ),
      )
      .toBe(4);
    await expect.poll(insetPadding).toBe("32px");
  });

  test("applies a scale preset, calls an edited one Custom, and undoes", async ({
    seededPage: page,
  }) => {
    const preset = page.getByLabel("Scale preset", { exact: true });
    const steps = page.getByRole("region", { name: "Generated spacing steps" });
    const chip = (step: string) =>
      page.getByRole("button", { name: `Keep step ${step}`, exact: true });
    const kept = steps.locator("li:not([data-pruned])");
    const stored = async () =>
      (await readStoredWorkspace(page))?.spacing as
        { baseUnitPx: number; steps: number[] } | undefined;

    /* The seeded scale is no preset. */
    await expect(preset).toContainText("Custom");
    const seededCount = await kept.count();

    /* One pick sets the base unit and the kept steps together. */
    await preset.click();
    await page.getByRole("option", { name: /8pt Standard Grid/ }).click();
    await expect(preset).toContainText("8pt Standard Grid");
    await expect.poll(async () => (await stored())?.baseUnitPx).toBe(8);
    await expect
      .poll(async () => (await stored())?.steps)
      .toEqual([0, 0.5, 1, 2, 3, 4, 6, 8, 12]);
    await expect(kept).toHaveCount(9);
    await expect(chip("12")).toHaveAttribute("aria-pressed", "true");
    await expect(chip("5")).toHaveAttribute("aria-pressed", "false");
    // 8px on an 8px grid: step 4 is 32px.
    await expect(steps.getByText("32px", { exact: true })).toBeVisible();

    /* A step pruned from its row is a scale of its own: Custom. */
    await chip("6").click();
    await expect(preset).toContainText("Custom");

    /* Undo takes back the chip, then the preset, as one step each. */
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(preset).toContainText("8pt Standard Grid");
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(preset).toContainText("Custom");
    await expect(kept).toHaveCount(seededCount);
    await expect.poll(async () => (await stored())?.baseUnitPx).toBe(4);
  });

  test("sets density from a preset, moving layout steps and not the grid", async ({
    seededPage: page,
  }) => {
    const steps = page.getByRole("region", { name: "Generated spacing steps" });
    const row = (step: string) =>
      steps.locator(`[data-spacing-step="${step}"]`);
    const density = async () =>
      ((await readStoredWorkspace(page))?.spacing as { density: number })
        ?.density;

    await page.getByRole("radio", { name: "Compact 0.75×" }).click();
    await expect.poll(density).toBe(0.75);
    /* Step 2 is the first layout step: 8px at 1x, 6px compact; its size
       says what density did, with no multiplier beside it. Step 1 is on
       the fine grid: 4px, and locked. */
    await expect(row("2").getByText("6px", { exact: true })).toBeVisible();
    await expect(row("2")).not.toContainText("×");
    await expect(row("1").getByText("4px", { exact: true })).toBeVisible();
    await expect(
      row("1").getByRole("img", { name: /^Fixed on base grid/ }),
    ).toBeVisible();
    // The hover says why.
    await expect(
      row("1").getByRole("img", { name: /^Fixed on base grid/ }),
    ).toHaveAttribute(
      "title",
      "Fixed on base grid: does not scale with density",
    );

    await page.getByRole("radio", { name: "Spacious 1.25×" }).click();
    await expect.poll(density).toBe(1.25);
    await expect(row("16").getByText("80px", { exact: true })).toBeVisible();
    // The slider shows where the preset put it.
    await expect(page.getByRole("slider", { name: /Density/ })).toHaveAttribute(
      "aria-valuenow",
      "1.25",
    );
  });

  test("pruning a step moves the layout uses on it to the nearest kept", async ({
    seededPage: page,
  }) => {
    const insetOnPhone = async () =>
      (
        (await readStoredWorkspace(page))?.layout as {
          id: string;
          byDevice: Record<string, string>;
        }[]
      )?.find((token) => token.id === "inset-container")?.byDevice.phone;
    const reachesFor = async (step: string) =>
      (
        (await readStoredWorkspace(page))?.layout as {
          kind: string;
          byDevice: Record<string, string>;
        }[]
      ).some(
        (token) =>
          token.kind === "spacing" &&
          Object.values(token.byDevice).includes(step),
      );
    const steps = page.getByRole("region", { name: "Generated spacing steps" });
    // The rows carry no layout-use badges.
    await expect(steps.locator("[data-layout-use]")).toHaveCount(0);

    /* Container inset is step 4 on a phone. Pruning 4 leaves 3 and 5 as
       near; the tie goes to the tighter 3, and nothing names 4 any more. */
    await page
      .getByRole("button", { name: "Keep step 4", exact: true })
      .click();
    await expect.poll(insetOnPhone).toBe("3");
    expect(await reachesFor("4")).toBe(false);

    /* The Uses table shows the new step: 12px, step 3. */
    const uses = await openSpacingUses(page);
    await expect(
      uses.getByRole("button", { name: "Container inset on Phone" }),
    ).toHaveText("12(3)");

    /* One undo puts back the step and the use on it. */
    await page.getByRole("button", { name: "Undo" }).click();
    await expect.poll(insetOnPhone).toBe("4");
  });

  test("puts the keep box at the start of each row", async ({
    seededPage: page,
  }) => {
    const row = page
      .getByRole("region", { name: "Generated spacing steps" })
      .locator('[data-spacing-step="4"]');
    const box = await row
      .getByRole("button", { name: "Keep step 4", exact: true })
      .boundingBox();
    const name = await row.locator("code").boundingBox();
    const value = await row.locator("[data-spacing-value]").boundingBox();
    const rowBox = await row.boundingBox();
    // The box leads the row, the variable follows it, the value ends it.
    expect(box!.x - rowBox!.x).toBeLessThan(16);
    expect(name!.x).toBeGreaterThanOrEqual(box!.x + box!.width);
    expect(value!.x).toBeGreaterThan(name!.x);
    // No bar any more: the value says the size.
    await expect(row.locator("[class*=tokenBar]")).toHaveCount(0);
  });

  test("prunes a step from its row, and keeps it pruned", async ({
    seededPage: page,
  }) => {
    const steps = page.getByRole("region", { name: "Generated spacing steps" });
    const rows = await steps.getByRole("listitem").count();
    const row = steps.locator('[data-spacing-step="10"]');
    const toggle = page.getByRole("button", {
      name: "Keep step 10",
      exact: true,
    });

    /* The inspector has no step chips: the rows are where steps are kept. */
    await expect(
      page.getByRole("region", { name: "Steps", exact: true }),
    ).toHaveCount(0);

    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await toggle.click();

    /* Still listed, dimmed, so it can come back. */
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await expect(row).toHaveAttribute("data-pruned", "true");
    await expect(steps.getByRole("listitem")).toHaveCount(rows);
    // A pruned step cannot be picked for the preview.
    await expect(
      row.getByRole("button", { name: "--spacing-10" }),
    ).toBeDisabled();
    await expect(row.getByRole("button", { name: "--spacing-10" })).toHaveCSS(
      "opacity",
      "0.4",
    );

    await expect
      .poll(async () => (await readStoredWorkspace(page))?.spacing?.steps)
      .not.toContain(10);

    await page.reload();
    await expect(
      page.getByRole("button", { name: "Keep step 10", exact: true }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  test("a pruned step moves the preview to the nearest kept one", async ({
    seededPage: page,
  }) => {
    const steps = page.getByRole("region", { name: "Generated spacing steps" });
    const inset = page
      .getByRole("figure", { name: "Spacing preview" })
      .locator('[data-spacing-zone="inset"]')
      .first();
    // The inset slot starts on step 6, 24px.
    await expect(inset).toHaveCSS("padding-top", "24px");
    await expect(steps.locator('[data-spacing-step="6"]')).toHaveAttribute(
      "data-selected",
      "true",
    );

    await page
      .getByRole("button", { name: "Keep step 6", exact: true })
      .click();
    await expect(inset).not.toHaveCSS("padding-top", "24px");
    await expect(steps.locator('[data-spacing-step="6"]')).not.toHaveAttribute(
      "data-selected",
    );

    /* Undo keeps the step again, and the preview goes back to it. */
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(
      page.getByRole("button", { name: "Keep step 6", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(inset).toHaveCSS("padding-top", "24px");
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
    await expect(
      hairline.getByRole("img", { name: /^Fixed on base grid/ }),
    ).toBeVisible();
    // Only a fine step is locked; a layout step says what density did.
    await expect(padding.getByRole("img")).toHaveCount(0);

    await expect
      .poll(async () => (await readStoredWorkspace(page))?.spacing?.density)
      .toBe(1.25);
  });

  test("puts the lock after the name, and every row at one height", async ({
    seededPage: page,
  }) => {
    const steps = page.getByRole("region", { name: "Generated spacing steps" });
    const hairline = steps.locator('[data-spacing-step="0.5"]');
    const lock = hairline.getByRole("img", { name: /^Fixed on base grid/ });
    const name = hairline.locator("code");
    const value = hairline.locator("[data-spacing-value]");

    /* After the name, on its line, before the value. */
    const lockBox = (await lock.boundingBox())!;
    const nameBox = (await name.boundingBox())!;
    const valueBox = (await value.boundingBox())!;
    expect(lockBox.x).toBeGreaterThanOrEqual(nameBox.x + nameBox.width);
    expect(lockBox.x + lockBox.width).toBeLessThanOrEqual(valueBox.x);
    expect(
      Math.abs(
        lockBox.y + lockBox.height / 2 - (nameBox.y + nameBox.height / 2),
      ),
    ).toBeLessThan(2);

    /* Kept or pruned, locked or not, a row is one height, and a toggle
       does not change it. */
    const heights = () =>
      steps.evaluate((section) => [
        ...new Set(
          [...section.querySelectorAll("li")].map(
            (row) => row.getBoundingClientRect().height,
          ),
        ),
      ]);
    expect(await heights()).toHaveLength(1);
    await page
      .getByRole("button", { name: "Keep step 0-5", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Keep step 7", exact: true })
      .click();
    await expect(hairline).toHaveAttribute("data-pruned", "true");
    expect(await heights()).toHaveLength(1);
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
    // 96 by 72px.
    const dialogBox = (await sample.boundingBox())!;
    expect([Math.round(dialogBox.width), Math.round(dialogBox.height)]).toEqual(
      [96, 72],
    );
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
    /* Quieter than the level's name beside it: muted ink, thinner stroke. */
    const look = await copy.evaluate((button) => {
      const name = button
        .closest("[data-elevation-level]")!
        .querySelector("button[aria-pressed]")!;
      return {
        ink: getComputedStyle(button).color,
        nameInk: getComputedStyle(name).color,
        stroke: getComputedStyle(button.querySelector("svg")!).strokeWidth,
      };
    });
    expect(look.ink).not.toBe(look.nameInk);
    expect(look.stroke).toBe("1.5px");
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

    const resetButton = adjustments.getByRole("button", {
      name: "Reset Softness",
    });

    /* An untouched level has nothing to reset, so no button. Seeded Low
       resets to its own seed, Softness 8, not to Standard's. */
    await expect(softness).toHaveAttribute("aria-valuenow", "8");
    await expect(resetButton).toHaveCount(0);

    /* Moved, the reset button appears at the end of the row: the way to
       reset that anyone can find. */
    await softness.focus();
    await softness.press("End");
    await expect(softness).toHaveAttribute("aria-valuenow", "48");
    await resetButton.click();
    await expect(softness).toHaveAttribute("aria-valuenow", "8");
    await expect(resetButton).toHaveCount(0);

    // Double-clicking the name does the same, as in Lightroom.
    await softness.focus();
    await softness.press("End");
    await reset.dblclick();
    await expect(softness).toHaveAttribute("aria-valuenow", "8");

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
    const toggle = page.getByRole("button", {
      name: "Keep step 10",
      exact: true,
    });

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");

    await page.getByRole("button", { name: "Undo" }).click();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");

    await page.getByRole("button", { name: "Redo" }).click();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
  });

  test("undoes the last action on the page, not only this view", async ({
    seededPage: page,
  }) => {
    /* Spacing, radius and elevation share one history: an undo is the last
       thing done in this studio, even after switching views. */

    const toggle = page.getByRole("button", {
      name: "Keep step 10",
      exact: true,
    });
    await toggle.click();

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
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
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
    /* A control's two insets, then the grid, nav and card uses, keep
       their places after them. */
    await expect
      .poll(() => rowIds(uses))
      .toEqual([
        "gap-section",
        "inset-container",
        "inset-control-x",
        "inset-control-y",
        "gap-grid",
        "gap-nav",
        "inset-card",
      ]);
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
