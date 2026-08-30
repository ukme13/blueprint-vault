import {
  expect,
  test,
  PALETTE_VIEW_STORAGE_KEY,
  WORKSPACE_STORAGE_KEY,
} from "./fixtures";
import type { Page } from "@playwright/test";

const SIMULATIONS = [
  "Normal vision",
  "Protanopia",
  "Deuteranopia",
  "Tritanopia",
  "Achromatopsia",
];

async function openPreview(page: Page) {
  await page.getByRole("button", { name: "Preview" }).click();
  await expect(page.getByLabel("Colour vision")).toBeVisible();
}

async function chooseSimulation(page: Page, name: string) {
  await page.getByLabel("Colour vision").click();
  await page.getByRole("option", { name, exact: true }).click();

  /* Wait for the trigger to show the new mode before returning. Clicking the
     option resolves as soon as the click is dispatched, which is before React
     has re-rendered the preview — so a swatch read straight afterwards gets
     the previous colour and reads as a transform that did not apply. It is the
     only assertion here that retries, and everything below depends on it. */
  await expect(page.getByLabel("Colour vision")).toContainText(name);
}

/**
 * The rendered background of a preview button, once it has settled.
 *
 * The buttons carry a 200ms colour transition, so for a fifth of a second
 * after a mode changes the computed background is still somewhere between the
 * old colour and the new one. Reading it straight away returns the previous
 * mode's colour and looks exactly like a transform that never applied — which
 * is how this was first misread.
 *
 * Polling until the computed value matches the inline one is the definitive
 * "the transition has finished" condition, rather than a sleep.
 */
async function backgroundOf(page: Page, buttonName: string) {
  const button = page.getByRole("button", { name: buttonName, exact: true });

  await expect
    .poll(() =>
      button.evaluate(
        (node) =>
          (node as HTMLElement).style.backgroundColor ===
          getComputedStyle(node).backgroundColor,
      ),
    )
    .toBe(true);

  return button.evaluate((node) => getComputedStyle(node).backgroundColor);
}

function channels(colour: string): number[] {
  const found = colour.match(/\d+(\.\d+)?/g);
  if (!found) throw new Error(`not a colour: ${colour}`);
  return found.slice(0, 3).map(Number);
}

test.describe("Colour vision simulation", () => {
  test("offers every mode and applies it to the rendered swatches", async ({
    seededPage: page,
  }) => {
    await openPreview(page);

    await page.getByLabel("Colour vision").click();
    for (const name of SIMULATIONS) {
      await expect(
        page.getByRole("option", { name, exact: true }),
      ).toBeVisible();
    }
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("option", { name: "Normal vision", exact: true }),
    ).toBeHidden();

    const normal = await backgroundOf(page, "Primary action");

    /* Achromatopsia is the one mode whose result can be checked without
       reimplementing the transform in the test: a luminance-preserving
       greyscale must come out neutral, whatever the palette. */
    await chooseSimulation(page, "Achromatopsia");
    const grey = await backgroundOf(page, "Primary action");
    const [red, green, blue] = channels(grey);
    expect(Math.abs(red! - green!)).toBeLessThanOrEqual(1);
    expect(Math.abs(green! - blue!)).toBeLessThanOrEqual(1);
    expect(grey).not.toBe(normal);

    /* Deuteranopia must move the colour without flattening it, which is what
       separates a working transform from one that greys everything out. */
    await chooseSimulation(page, "Deuteranopia");
    const deutan = await backgroundOf(page, "Primary action");
    expect(deutan).not.toBe(normal);
    expect(deutan).not.toBe(grey);
    const [deutanRed, deutanGreen, deutanBlue] = channels(deutan);
    expect(
      Math.max(deutanRed!, deutanGreen!, deutanBlue!) -
        Math.min(deutanRed!, deutanGreen!, deutanBlue!),
    ).toBeGreaterThan(2);

    await chooseSimulation(page, "Normal vision");
    expect(await backgroundOf(page, "Primary action")).toBe(normal);
  });

  test("never writes a simulated colour into the project", async ({
    seededPage: page,
  }) => {
    await openPreview(page);

    const before = await page.evaluate(
      (key) => window.localStorage.getItem(key),
      WORKSPACE_STORAGE_KEY,
    );
    expect(before).toBeTruthy();

    for (const name of SIMULATIONS.slice(1)) {
      await chooseSimulation(page, name);
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
    expect(after).not.toContain("simulation");
  });

  test("keeps the simulation and the contrast panel across a reload", async ({
    seededPage: page,
  }) => {
    await openPreview(page);
    await chooseSimulation(page, "Tritanopia");

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
    await page.getByRole("button", { name: "Preview" }).click();
    await expect(page.getByLabel("Colour vision")).toContainText("Tritanopia");
  });

  test("keeps the view mode out of the project and in its own store", async ({
    seededPage: page,
  }) => {
    await openPreview(page);
    await chooseSimulation(page, "Protanopia");

    const stored = await page.evaluate(
      (key) => window.localStorage.getItem(key),
      PALETTE_VIEW_STORAGE_KEY,
    );
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored!)).toMatchObject({ simulation: "protanopia" });
  });

  test("falls back to normal vision when the stored mode is unreadable", async ({
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

    await openPreview(page);
    await expect(page.getByLabel("Colour vision")).toContainText(
      "Normal vision",
    );
  });
});
