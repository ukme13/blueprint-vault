import type { Locator, Page } from "@playwright/test";
import { expect } from "./fixtures";

/**
 * What the inspect panel's specs share: where the panel and its sections are,
 * the elements they select, and the two ways of opening a list and picking
 * from it. The specs are split by what they cover: the panel itself, the edits
 * it makes, the outline, and what the page is drawn with.
 */

export const HERO_TITLE = "Finish the piece in one place";

export const panel = (page: Page) =>
  page.getByRole("complementary", { name: "Inspect" });
export const section = (page: Page, name: string) =>
  panel(page).getByRole("region", { name, exact: true });
export const heroTitle = (page: Page) =>
  page.getByRole("heading", { name: HERO_TITLE, level: 1 });
export const seeThePreview = (page: Page) =>
  page.getByRole("button", { name: "See the preview" });
export const heroBand = (page: Page) =>
  page.locator('[data-preview-section="landing-hero"]');

export const style = (locator: Locator, property: string) =>
  locator.evaluate(
    (node, name) => getComputedStyle(node).getPropertyValue(name as string),
    property,
  );

/** Picks from the list a control has just opened, by what an option says. */
export const pick = async (page: Page, hasText: string | RegExp) => {
  const options = page.getByRole("option").filter({ hasText });
  /* The Default row carries the number the page has, so "8px" would match it:
     it is picked by name only. */
  const wantsDefault = typeof hasText === "string" && hasText === "Default";
  await (wantsDefault ? options : options.filter({ hasNotText: /^Default/ }))
    .first()
    .click();
};

/** Opens a control by its name and picks an option. */
export const choose = async (
  scope: Locator,
  page: Page,
  control: string,
  hasText: string | RegExp,
) => {
  await scope.getByRole("button", { name: control, exact: true }).click();
  await pick(page, hasText);
};

/* A band is selected by pressing on its own ground, away from its slots. */
export const selectHeroBand = async (page: Page) => {
  await heroBand(page).click({ position: { x: 6, y: 6 } });
  await expect(page.getByTestId("preview-selection")).toBeVisible();
  await expect(
    panel(page).getByRole("heading", { name: "Hero", level: 2 }),
  ).toBeVisible();
};
