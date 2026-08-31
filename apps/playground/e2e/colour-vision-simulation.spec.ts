import {
  expect,
  test,
  PALETTE_VIEW_STORAGE_KEY,
  WORKSPACE_STORAGE_KEY,
} from "./fixtures";
import type { Page } from "@playwright/test";

const DEFICIENCIES = [
  "Protanopia (red-blind)",
  "Deuteranopia (green-blind)",
  "Tritanopia (blue-blind)",
  "Achromatopsia (no colour)",
];

function visionChip(page: Page) {
  return page.getByRole("button", { name: "Vision", exact: true });
}

async function turnVisionOn(page: Page) {
  await visionChip(page).click();
  await expect(visionChip(page)).toHaveAttribute("aria-pressed", "true");
}

async function chooseDeficiency(page: Page, name: string) {
  await page.getByLabel("Vision type").click();
  await page.getByRole("option", { name, exact: true }).click();

  /* Wait for the trigger to show the new mode before returning. Clicking the
     option resolves as soon as the click is dispatched, which is before React
     has re-rendered — so a swatch read straight afterwards gets the previous
     colour and reads as a transform that did not apply. */
  await expect(page.getByLabel("Vision type")).toContainText(name);
}

/**
 * The rendered background of a shade in the matrix, once it has settled.
 *
 * Swatches carry a colour transition, so for a fraction of a second after a
 * mode changes the computed background is still somewhere between the old
 * colour and the new one. Polling until the computed value matches the inline
 * one is the definitive "the transition has finished" condition, rather than a
 * sleep.
 */
async function shadeBackground(page: Page) {
  const shade = page
    .getByRole("button", { name: /^Select primary 500/ })
    .first();

  await expect
    .poll(() =>
      shade.evaluate(
        (node) =>
          (node as HTMLElement).style.backgroundColor ===
          getComputedStyle(node).backgroundColor,
      ),
    )
    .toBe(true);

  return shade.evaluate((node) => getComputedStyle(node).backgroundColor);
}

function channels(colour: string): number[] {
  const found = colour.match(/\d+(\.\d+)?/g);
  if (!found) throw new Error(`not a colour: ${colour}`);
  return found.slice(0, 3).map(Number);
}

test.describe("The Vision chip", () => {
  test("is off until pressed, and turns itself off again", async ({
    seededPage: page,
  }) => {
    /* No separate on/off switch: the chip is the switch. Pressing it again is
       how the feature is turned off, which is why "normal vision" is not in
       the list. */
    await expect(visionChip(page)).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByLabel("Vision type")).toBeHidden();

    await turnVisionOn(page);
    await expect(page.getByLabel("Vision type")).toBeVisible();

    await visionChip(page).click();
    await expect(visionChip(page)).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByLabel("Vision type")).toBeHidden();
  });

  test("offers the deficiencies only, never normal vision", async ({
    seededPage: page,
  }) => {
    await turnVisionOn(page);
    await page.getByLabel("Vision type").click();

    for (const name of DEFICIENCIES) {
      await expect(
        page.getByRole("option", { name, exact: true }),
      ).toBeVisible();
    }
    await expect(page.getByRole("option")).toHaveCount(DEFICIENCIES.length);
    await expect(page.getByRole("option", { name: /Normal/ })).toHaveCount(0);
  });

  test("lines up with the other toolbar controls", async ({
    seededPage: page,
  }) => {
    /* The chip and its selector are one control, so the outline has to be one
       box: same top edge and same height as Add colour and WCAG 2 beside them.

       This started 4px low and 8px short, because the ghost selector inside
       set the height and it is 20px. Nothing in the suite could see that — a
       control can be misaligned and every behavioural test still passes. */
    await turnVisionOn(page);

    const boxes = await Promise.all(
      [
        page.getByRole("button", { name: "Add colour" }),
        page.getByRole("button", { name: "WCAG 2" }),
        visionChip(page),
        page
          .getByLabel("Vision type")
          .locator("xpath=ancestor::span[contains(@class,'visionOptions')][1]"),
      ].map((locator) => locator.boundingBox()),
    );

    const [reference, ...rest] = boxes;
    for (const box of rest) {
      expect(box!.y).toBeCloseTo(reference!.y, 1);
      expect(box!.height).toBeCloseTo(reference!.height, 1);
    }

    // And joined, rather than two boxes with a gap between them.
    const chip = boxes[2]!;
    const options = boxes[3]!;
    expect(options.x).toBeCloseTo(chip.x + chip.width, 0);
  });

  test("applies the simulation to the palette swatches", async ({
    seededPage: page,
  }) => {
    const normal = await shadeBackground(page);

    await turnVisionOn(page);

    /* Achromatopsia is the one mode whose result can be checked without
       reimplementing the transform in the test: a luminance-preserving
       greyscale must come out neutral, whatever the palette. */
    await chooseDeficiency(page, "Achromatopsia (no colour)");
    const grey = await shadeBackground(page);
    const [red, green, blue] = channels(grey);
    expect(Math.abs(red! - green!)).toBeLessThanOrEqual(1);
    expect(Math.abs(green! - blue!)).toBeLessThanOrEqual(1);
    expect(grey).not.toBe(normal);

    /* Deuteranopia must move the colour without flattening it, which is what
       separates a working transform from one that greys everything out. */
    await chooseDeficiency(page, "Deuteranopia (green-blind)");
    const deutan = await shadeBackground(page);
    expect(deutan).not.toBe(normal);
    expect(deutan).not.toBe(grey);
    const spread =
      Math.max(...channels(deutan)) - Math.min(...channels(deutan));
    expect(spread).toBeGreaterThan(2);

    await visionChip(page).click();
    expect(await shadeBackground(page)).toBe(normal);
  });

  test("keeps the real hex in the label while the swatch is simulated", async ({
    seededPage: page,
  }) => {
    /* The value somebody copies out of a swatch is the token, not what it
       looks like through the simulation. */
    const shade = page
      .getByRole("button", { name: /^Select primary 500/ })
      .first();
    const label = await shade.getAttribute("aria-label");

    await turnVisionOn(page);
    await chooseDeficiency(page, "Protanopia (red-blind)");

    expect(await shade.getAttribute("aria-label")).toBe(label);
  });

  test("simulates the swatch in the shade details, not the value", async ({
    seededPage: page,
  }) => {
    /* Clicking a shade opens its details, and the swatch there has to agree
       with the swatch that was clicked — two views of one colour showing two
       different colours is worse than not simulating at all.

       The hex beside it stays real, because that is the token being inspected
       and the value somebody copies. Achromatopsia makes both halves checkable
       at once without reimplementing the transform: the swatch must be neutral
       and the text must not be. */
    await turnVisionOn(page);
    await chooseDeficiency(page, "Achromatopsia (no colour)");

    await page
      .getByRole("button", { name: /^Select primary 500/ })
      .first()
      .click();

    const heading = page.getByText("primary · 500", { exact: true });
    await expect(heading).toBeVisible();

    const swatch = heading.locator("xpath=..").locator("i").first();
    const [red, green, blue] = channels(
      await swatch.evaluate((node) => getComputedStyle(node).backgroundColor),
    );
    expect(Math.abs(red! - green!)).toBeLessThanOrEqual(1);
    expect(Math.abs(green! - blue!)).toBeLessThanOrEqual(1);

    /* The value is untouched: a real palette hex is not a grey. */
    const shown = await page
      .getByRole("button", { name: /^Select primary 500/ })
      .first()
      .getAttribute("title");
    const hex = shown!.split("·")[1]!.trim();
    const [hexRed, hexGreen, hexBlue] = [1, 3, 5].map((at) =>
      Number.parseInt(hex.slice(at, at + 2), 16),
    );
    expect(
      Math.max(hexRed!, hexGreen!, hexBlue!) -
        Math.min(hexRed!, hexGreen!, hexBlue!),
    ).toBeGreaterThan(2);
  });

  test("simulates the contrast sample in the shade details, and states the ratio", async ({
    seededPage: page,
  }) => {
    /* The popover's own swatch simulated while the pair beneath it did not, so
       the contrast block demonstrated a colour nobody on that screen could
       see. Both are views of the palette, so both simulate, and the simulated
       ratio gets its own line with no verdict attached — the same shape the
       preview panel already uses. */
    await turnVisionOn(page);
    await chooseDeficiency(page, "Achromatopsia (no colour)");

    await page
      .getByRole("button", { name: /^Select primary 500/ })
      .first()
      .click();

    /* Every shade keeps a popover in the DOM, so the label alone matches 120
       of them. Scope to the one that was opened, as the test above does. */
    const popover = page
      .getByText("primary · 500", { exact: true })
      .locator("xpath=ancestor::section[1]");
    const contrast = popover.getByLabel("WCAG 2 contrast result");
    await expect(contrast).toBeVisible();

    /* The Aa sample is a view, so achromatopsia leaves it grey. */
    const sample = contrast.locator("span").first();
    const [red, green, blue] = channels(
      await sample.evaluate((node) => getComputedStyle(node).color),
    );
    expect(Math.abs(red! - green!)).toBeLessThanOrEqual(1);
    expect(Math.abs(green! - blue!)).toBeLessThanOrEqual(1);

    await expect(contrast.getByText(/:1 under achromatopsia/)).toBeVisible();
  });

  test("never writes a simulated colour into the project", async ({
    seededPage: page,
  }) => {
    const before = await page.evaluate(
      (key) => window.localStorage.getItem(key),
      WORKSPACE_STORAGE_KEY,
    );
    expect(before).toBeTruthy();

    await turnVisionOn(page);
    for (const name of DEFICIENCIES) {
      await chooseDeficiency(page, name);
    }

    const after = await page.evaluate(
      (key) => window.localStorage.getItem(key),
      WORKSPACE_STORAGE_KEY,
    );

    /* The whole rule in one assertion: every mode has been through, and the
       stored project is byte-identical. A simulated value reaching a token
       would show up here, and so would a stray write of the view mode into
       the document. */
    expect(after).toBe(before);
    expect(after).not.toContain("deficiency");
  });

  test("keeps the mode and the contrast panel across a reload", async ({
    seededPage: page,
  }) => {
    await turnVisionOn(page);
    await chooseDeficiency(page, "Tritanopia (blue-blind)");

    const contrastMode = page.getByRole("button", { name: "WCAG 2" });
    await contrastMode.click();
    await expect(contrastMode).toHaveAttribute("aria-pressed", "true");

    await page.reload();
    await expect(
      page.getByRole("region", { name: "Palette toolbar" }),
    ).toBeVisible();

    /* Both modes, in one test, because the reason they were moved into one
       store is that they used to disagree: the simulation would survive a
       reload and the contrast panel beside it would not. */
    await expect(page.getByRole("button", { name: "WCAG 2" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(visionChip(page)).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByLabel("Vision type")).toContainText("Tritanopia");
  });

  test("remembers the chosen mode after being switched off", async ({
    seededPage: page,
  }) => {
    /* Turning the chip off is not the same as forgetting the choice. */
    await turnVisionOn(page);
    await chooseDeficiency(page, "Protanopia (red-blind)");
    await visionChip(page).click();
    await expect(visionChip(page)).toHaveAttribute("aria-pressed", "false");

    await turnVisionOn(page);
    await expect(page.getByLabel("Vision type")).toContainText("Protanopia");
  });

  test("falls back to the default when the stored mode is unreadable", async ({
    seededPage: page,
  }) => {
    /* Stored preferences are read tolerantly: a value nobody can parse costs a
       click, and must not cost the session. */
    await page.evaluate(
      (key) => window.localStorage.setItem(key, "{ not json"),
      PALETTE_VIEW_STORAGE_KEY,
    );
    await page.reload();
    await expect(
      page.getByRole("region", { name: "Palette toolbar" }),
    ).toBeVisible();

    await expect(visionChip(page)).toHaveAttribute("aria-pressed", "false");
  });
});

test.describe("Semantic pairs under simulation", () => {
  test("warns about a pair that only collapses for some people", async ({
    seededPage: page,
  }) => {
    /* The case the goal names: success and error are a comfortable distance
       apart to normal vision and collide under the most common deficiency.
       The warning is present with the chip off, because otherwise it is only
       found by somebody who already went looking. */
    await page.getByRole("button", { name: "Preview" }).click();

    const successError = page
      .getByText("Success and error", { exact: true })
      .locator("../..");

    await expect(successError).toContainText(
      "Distinct to normal colour vision",
    );
    await expect(successError).toContainText("Deuteranopia");
    await expect(successError).toContainText("Pair these with text or an icon");
    /* Exact, because the summary sentence beside it also contains the words
       "colour vision" — this is the badge, not the prose. */
    await expect(
      successError.getByText("Colour vision", { exact: true }),
    ).toBeVisible();
  });

  test("counts a collapsing pair in the warning total", async ({
    seededPage: page,
  }) => {
    await page.getByRole("button", { name: "Preview" }).click();

    const badge = page
      .getByRole("heading", { name: "Accessibility" })
      .locator("../..")
      .getByText(/warnings|No warnings/);

    await expect(badge).toBeVisible();
    await expect(badge).not.toContainText("No warnings");
  });
});

test.describe("Severity", () => {
  const slider = (page: Page) =>
    page.getByRole("slider", { name: "Vision severity" });

  /** Step the slider down from full strength, one published matrix at a time. */
  async function lowerSeverity(page: Page, steps: number) {
    await slider(page).focus();
    for (let step = 0; step < steps; step += 1) {
      await page.keyboard.press("ArrowLeft");
    }
  }

  test("appears with the chip and not before", async ({ seededPage: page }) => {
    await expect(slider(page)).toBeHidden();
    await turnVisionOn(page);
    await expect(slider(page)).toBeVisible();
  });

  test("renames the condition below full strength", async ({
    seededPage: page,
  }) => {
    /* At 1.0 this is deuteranopia; below it, it is deuteranomaly, which is a
       different condition. A picker that kept saying "Deuteranopia" while
       simulating 0.6 would be naming something it was not showing. */
    await turnVisionOn(page);
    await expect(page.getByLabel("Vision type")).toContainText(
      "Deuteranopia (green-blind)",
    );

    await lowerSeverity(page, 4);
    await expect(page.getByLabel("Vision type")).toContainText(
      "Deuteranomaly (green-weak)",
    );
  });

  test("moves the palette by degrees", async ({ seededPage: page }) => {
    await turnVisionOn(page);
    await chooseDeficiency(page, "Protanopia (red-blind)");
    const full = await shadeBackground(page);

    await lowerSeverity(page, 5);
    const half = await shadeBackground(page);

    await expect(slider(page)).toHaveAttribute("aria-valuenow", "0.5");
    expect(half).not.toBe(full);
  });

  test("survives a reload", async ({ seededPage: page }) => {
    await turnVisionOn(page);
    await lowerSeverity(page, 7);
    await expect(slider(page)).toHaveAttribute("aria-valuenow", "0.3");

    await page.reload();
    await expect(
      page.getByRole("region", { name: "Palette toolbar" }),
    ).toBeVisible();

    await expect(slider(page)).toHaveAttribute("aria-valuenow", "0.3");
  });

  test("never reaches zero, because that is the chip being off", async ({
    seededPage: page,
  }) => {
    await turnVisionOn(page);
    await lowerSeverity(page, 20);

    await expect(slider(page)).toHaveAttribute("aria-valuenow", "0.1");
  });
});

test.describe("Contrast under simulation", () => {
  const errorRow = (page: Page) =>
    page.getByText("Error action text", { exact: true }).locator("../..");

  test("shows no simulated ratio while the chip is off", async ({
    seededPage: page,
  }) => {
    await page.getByRole("button", { name: "Preview" }).click();
    await expect(errorRow(page)).toContainText("Passes AA");
    await expect(errorRow(page)).not.toContainText("under deuteranopia");
  });

  test("reports the ratio for the colours actually on screen", async ({
    seededPage: page,
  }) => {
    /* What was asked for: the number follows the colour. */
    await turnVisionOn(page);
    await page.getByRole("button", { name: "Preview" }).click();

    await expect(errorRow(page)).toContainText("under deuteranopia");
    await expect(errorRow(page)).toContainText(/\d+\.\d\d:1 under/);
  });

  test("attaches no WCAG verdict to a simulated ratio", async ({
    seededPage: page,
  }) => {
    /* WCAG defines AA on the actual colours. The simulated line is a
       measurement and must never read as a pass or a fail — the verdict above
       it belongs to the real palette and stays there. */
    await turnVisionOn(page);
    await page.getByRole("button", { name: "Preview" }).click();

    const simulated = errorRow(page).getByText(/under deuteranopia/);
    await expect(simulated).toBeVisible();
    await expect(simulated).not.toContainText("AA");
    await expect(simulated).not.toContainText("AAA");
    await expect(simulated).not.toContainText("Pass");
    await expect(simulated).not.toContainText("Fail");
  });

  test("changes with the deficiency and with the severity", async ({
    seededPage: page,
  }) => {
    await turnVisionOn(page);
    await page.getByRole("button", { name: "Preview" }).click();

    const ratio = async () => {
      const text = await errorRow(page).innerText();
      return Number(/(\d+\.\d\d):1 under/.exec(text)![1]);
    };

    const deutan = await ratio();
    await chooseDeficiency(page, "Protanopia (red-blind)");
    const protan = await ratio();
    expect(protan).not.toBeCloseTo(deutan, 2);

    await page.getByRole("slider", { name: "Vision severity" }).focus();
    for (let step = 0; step < 5; step += 1) {
      await page.keyboard.press("ArrowLeft");
    }
    await expect(errorRow(page)).toContainText("at 50%");
    expect(await ratio()).not.toBeCloseTo(protan, 2);
  });
});

test.describe("Where the simulated numbers show", () => {
  test("puts the simulated ratio on the matrix swatches", async ({
    seededPage: page,
  }) => {
    /* The ratios stamped on the palette under WCAG 2 mode are the ones people
       read first. They stayed on the real colours while the swatches beneath
       them were simulated, which is how somebody ends up asking whether the
       contrast changes at all. */
    await page.getByRole("button", { name: "WCAG 2" }).click();

    /* The whole error track rather than one shade. The extremes barely move —
       near-black stays near-black under any deficiency — so picking a single
       swatch is picking a lucky one. The mid shades are where the luminance
       goes. */
    const ratios = async () =>
      page
        .getByRole("button", { name: /^Select error / })
        .evaluateAll((nodes) =>
          nodes.map((node) =>
            Number(node.getAttribute("data-contrast-ratio") ?? 0),
          ),
        );

    const before = await ratios();
    await turnVisionOn(page);
    await chooseDeficiency(page, "Deuteranopia (green-blind)");
    const after = await ratios();

    expect(after).toHaveLength(before.length);
    const biggestShift = Math.max(
      ...after.map((value, index) => Math.abs(value - before[index]!)),
    );
    expect(biggestShift).toBeGreaterThan(0.5);
  });

  test("says which vision a swatch ratio was measured under", async ({
    seededPage: page,
  }) => {
    /* A screen reader gets the same number as a sighted reader, and the same
       reason for it. */
    await page.getByRole("button", { name: "WCAG 2" }).click();
    const shade = page
      .getByRole("button", { name: /^Select error 950/ })
      .first();

    expect(await shade.getAttribute("aria-label")).not.toContain("under");

    await turnVisionOn(page);
    expect(await shade.getAttribute("aria-label")).toContain(
      "under deuteranopia",
    );
  });

  test("renders the simulated line as legibly as the verdict above it", async ({
    seededPage: page,
  }) => {
    /* It shipped at neutral-550 because a bare class loses to the rule on
       `.contrastList small`, and nothing in the suite could tell the line was
       there but unreadable. Comparing the two colours is what catches that. */
    await turnVisionOn(page);
    await page.getByRole("button", { name: "Preview" }).click();

    const row = page
      .getByText("Error action text", { exact: true })
      .locator("../..");

    const [verdict, simulated] = await row.evaluate((node) => {
      const smalls = Array.from(node.querySelectorAll("small"));
      const find = (match: string) =>
        getComputedStyle(smalls.find((el) => el.textContent!.includes(match))!)
          .color;
      return [find("Passes"), find("under deuteranopia")];
    });

    expect(simulated).toBe(verdict);
  });
});
