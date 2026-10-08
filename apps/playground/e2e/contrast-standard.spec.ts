import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

/**
 * The Contrast tool: Contrast, WCAG 2, WCAG 3 and Off as one group. Contrast
 * names it and is never lit; the standard measuring is. The standard changes
 * the number on every swatch and the grades in a shade's details.
 */
const group = (page: Page) =>
  page.getByRole("group", { name: "Contrast", exact: true });
const contrastButton = (page: Page) =>
  group(page).getByRole("button", { name: "Contrast", exact: true });
const standard = (page: Page, name: "WCAG 2" | "WCAG 3") =>
  group(page).getByRole("button", { name, exact: true });
/** Off is nothing lit: neither standard is pressed. */
const expectOff = async (page: Page) => {
  await expect(standard(page, "WCAG 2")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect(standard(page, "WCAG 3")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
};
const comparison = (page: Page) =>
  page.getByRole("region", { name: "Contrast comparison", exact: true });

const readings = (page: Page) =>
  page
    .locator("button[data-contrast-ratio]")
    .evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("data-contrast-ratio")),
    );

test.describe("The Contrast tool", () => {
  test("starts off: no standard lit, and no numbers on the swatches", async ({
    seededPage: page,
  }) => {
    await expect(group(page)).toBeVisible();
    /* Three buttons and no Off: pressing a lit one is how it is turned off. */
    await expect(group(page).getByRole("button")).toHaveText([
      "Contrast",
      "WCAG 2",
      "WCAG 3",
    ]);
    await expectOff(page);
    await expect(comparison(page)).toHaveCount(0);
    await expect(page.locator("button[data-contrast-ratio]")).toHaveCount(0);
  });

  test("Contrast switches it on in WCAG 2 and never lights itself", async ({
    seededPage: page,
  }) => {
    await contrastButton(page).click();

    await expect(standard(page, "WCAG 2")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(standard(page, "WCAG 3")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    /* Not a mode: it has no pressed state of its own. */
    await expect(contrastButton(page)).not.toHaveAttribute("aria-pressed");
    await expect(comparison(page)).toBeVisible();
    await expect(
      comparison(page).getByRole("radiogroup", {
        name: "Contrast comparison colour",
      }),
    ).toBeVisible();
    await expect(
      page.locator("button[data-contrast-ratio]").first(),
    ).toBeVisible();
  });

  test("a press on the lit standard or on Contrast turns it off", async ({
    seededPage: page,
  }) => {
    for (const turnOff of [
      () => standard(page, "WCAG 2").click(),
      () => contrastButton(page).click(),
    ]) {
      await standard(page, "WCAG 2").click();
      await expect(comparison(page)).toBeVisible();
      await turnOff();
      await expectOff(page);
      await expect(comparison(page)).toHaveCount(0);
      await expect(page.locator("button[data-contrast-ratio]")).toHaveCount(0);
    }

    /* The other standard, pressed while one is lit, switches rather than
       turning off. */
    await standard(page, "WCAG 2").click();
    await standard(page, "WCAG 3").click();
    await expect(standard(page, "WCAG 3")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(standard(page, "WCAG 2")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await expect(comparison(page)).toBeVisible();
  });

  test("Contrast comes back on in the standard last used", async ({
    seededPage: page,
  }) => {
    await standard(page, "WCAG 3").click();
    await expect(standard(page, "WCAG 3")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await standard(page, "WCAG 3").click();
    await expectOff(page);

    /* Not WCAG 2, the default: the one the person chose. */
    await contrastButton(page).click();
    await expect(standard(page, "WCAG 3")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(standard(page, "WCAG 2")).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    /* And it is remembered across a reload, on or off. */
    await page.reload();
    await expect(standard(page, "WCAG 3")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await contrastButton(page).click();
    await page.reload();
    await expectOff(page);
    await contrastButton(page).click();
    await expect(standard(page, "WCAG 3")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("switches the swatches between a WCAG 2 ratio and a WCAG 3 Lc", async ({
    seededPage: page,
  }) => {
    await contrastButton(page).click();
    const swatch = page.locator("button[data-contrast-ratio]").first();

    /* A ratio to one place: 4.5 or 12.3, with a point. */
    await expect(swatch).toHaveAttribute("data-contrast-standard", "wcag2");
    const ratios = await readings(page);
    expect(ratios.length).toBeGreaterThan(0);
    for (const ratio of ratios) expect(ratio).toMatch(/^\d+\.\d$/);

    await standard(page, "WCAG 3").click();
    await expect(swatch).toHaveAttribute("data-contrast-standard", "wcag3");
    const lcs = await readings(page);
    expect(lcs).toHaveLength(ratios.length);
    /* The size of an Lc: a whole number, and not the ratios it replaced. */
    for (const lc of lcs) expect(lc).toMatch(/^\d+$/);
    expect(lcs).not.toEqual(ratios);
    await expect(swatch).toHaveAttribute("aria-label", /APCA contrast Lc \d+/);

    /* Back, and the ratios are the same ones. */
    await standard(page, "WCAG 2").click();
    expect(await readings(page)).toEqual(ratios);
  });

  test("grades a shade by the standard in force: AA and AAA, or Body, Large and UI", async ({
    seededPage: page,
  }) => {
    await standard(page, "WCAG 2").click();
    const shade = page.getByRole("button", { name: /Select primary 500,/ });
    await shade.first().click();
    const details = page.getByRole("dialog", {
      name: "primary 500 shade details",
    });

    const wcag2 = details.getByRole("region", {
      name: "WCAG 2 contrast result",
    });
    await expect(wcag2).toContainText("Large text");
    await expect(wcag2).toContainText("Small text");
    await expect(wcag2).toContainText(/\d+\.\d\d:1/);
    await expect(wcag2).not.toContainText("Body");

    /* The standard is changed outside the popover; close it to reach it. */
    await details.getByRole("button", { name: "Close shade details" }).click();
    await standard(page, "WCAG 3").click();
    await shade.first().click();

    const wcag3 = details.getByRole("region", {
      name: "WCAG 3 contrast result",
    });
    await expect(wcag3).toBeVisible();
    await expect(wcag3).toContainText(/Lc -?\d+\.\d/);
    for (const tier of ["Body", "Large", "UI"]) {
      await expect(wcag3.getByText(tier, { exact: false })).toBeVisible();
    }
    await expect(wcag3).toContainText("Lc 75");
    await expect(wcag3).toContainText("Lc 60");
    await expect(wcag3).toContainText("Lc 45");
    await expect(wcag3).not.toContainText("Small text");

    /* Turned round, the pair has another Lc: APCA knows which is the text. */
    const lc = wcag3.locator("strong");
    const before = await lc.getAttribute("data-apca-lc");
    await wcag3
      .getByRole("button", { name: "Swap text and background" })
      .click();
    await expect(lc).not.toHaveAttribute("data-apca-lc", before!);
    expect(Math.sign(Number(await lc.getAttribute("data-apca-lc")))).toBe(
      -Math.sign(Number(before)),
    );
  });
});
