import { expect, test } from "./typography-fixtures";

/**
 * A studio's view and tab live in the URL: Back and Forward move between
 * them, a refresh keeps them, and the sidebar's link to a studio returns to
 * where it was left.
 */
const studioLink = (page: import("@playwright/test").Page, name: string) =>
  page.getByRole("link", { name, exact: true });

test.describe("Typography studio", () => {
  test("opens on the editor and settings, with a clean address", async ({
    seededPage: page,
  }) => {
    expect(new URL(page.url()).search).toBe("");
    await expect(
      page.getByRole("region", { name: "Generated type steps" }),
    ).toBeVisible();
    await expect(page.getByRole("tab", { name: /^Settings/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("keeps its view and tab across another studio", async ({
    seededPage: page,
  }) => {
    await page.getByRole("button", { name: "Specimen" }).click();
    await page.getByRole("tab", { name: /^Groups/ }).click();
    await expect(page).toHaveURL(/view=specimen/);
    await expect(page).toHaveURL(/tab=groups/);

    await studioLink(page, "Spacing").click();
    await expect(page).toHaveURL(/\/spacing\/?$/);

    /* Back by the sidebar, not the browser: the link carries the view. */
    await studioLink(page, "Typography").click();
    await expect(page).toHaveURL(/view=specimen/);
    await expect(page).toHaveURL(/tab=groups/);
    await expect(
      page.getByRole("region", { name: "Type scale preview" }),
    ).toBeVisible();
    await expect(page.getByRole("tab", { name: /^Groups/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("returns to the defaults once the view is back on them", async ({
    seededPage: page,
  }) => {
    await page.getByRole("button", { name: "Specimen" }).click();
    await page.getByRole("button", { name: "Editor" }).click();
    /* The default is left out of the address, and out of the sidebar's link. */
    await expect(page).not.toHaveURL(/view=/);
    await studioLink(page, "Spacing").click();
    await expect(studioLink(page, "Typography")).toHaveAttribute(
      "href",
      "/typography",
    );
  });

  test("moves between views with Back and Forward", async ({
    seededPage: page,
  }) => {
    const specimen = page.getByRole("region", { name: "Type scale preview" });
    const editor = page.getByRole("region", { name: "Generated type steps" });

    await page.getByRole("button", { name: "Specimen" }).click();
    await page.getByRole("button", { name: "Preview", exact: true }).click();
    await expect(page).toHaveURL(/view=preview/);

    await page.goBack();
    await expect(page).toHaveURL(/view=specimen/);
    await expect(specimen).toBeVisible();

    await page.goBack();
    await expect(page).not.toHaveURL(/view=/);
    await expect(editor).toBeVisible();

    await page.goForward();
    await expect(page).toHaveURL(/view=specimen/);
    await expect(specimen).toBeVisible();
  });

  test("keeps its view and tab through a refresh", async ({
    seededPage: page,
  }) => {
    await page.goto("/typography?view=preview&tab=warnings");
    await expect(page.getByRole("tab", { name: /^Warnings/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await page.reload();
    await expect(page).toHaveURL(/view=preview/);
    await expect(page.getByRole("tab", { name: /^Warnings/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(
      page.getByRole("region", { name: "Type scale preview" }),
    ).toBeVisible();
  });

  test("reads an unknown view or tab as the default", async ({
    seededPage: page,
  }) => {
    await page.goto("/typography?view=nonsense&tab=nonsense");
    await expect(
      page.getByRole("region", { name: "Generated type steps" }),
    ).toBeVisible();
    await expect(page.getByRole("tab", { name: /^Settings/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});

test.describe("Scale studios", () => {
  const scaleNav = (page: import("@playwright/test").Page) =>
    page.getByRole("navigation", { name: "Scale sections" });

  test("keep the Uses view across another studio", async ({
    seededPage: page,
  }) => {
    await page.goto("/spacing");
    expect(new URL(page.url()).search).toBe("");
    await scaleNav(page).getByRole("button", { name: "Uses" }).click();
    await expect(page).toHaveURL(/view=uses/);
    await expect(
      page.getByRole("region", { name: "Spacing uses" }),
    ).toBeVisible();

    await studioLink(page, "Typography").click();
    await expect(page).toHaveURL(/\/typography/);

    await studioLink(page, "Spacing").click();
    await expect(page).toHaveURL(/view=uses/);
    await expect(
      page.getByRole("region", { name: "Spacing uses" }),
    ).toBeVisible();
  });

  test("keep a view to their own section", async ({ seededPage: page }) => {
    /* Radius has a Preview view; spacing does not, so it reads as Scale. */
    await page.goto("/spacing?view=preview");
    await expect(
      scaleNav(page).getByRole("button", { name: "Preview" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("region", { name: "Spacing uses" }),
    ).toHaveCount(0);
  });

  test("move between views with Back and Forward, and survive a refresh", async ({
    seededPage: page,
  }) => {
    await page.goto("/radius");
    await scaleNav(page).getByRole("button", { name: "Uses" }).click();
    await scaleNav(page).getByRole("button", { name: "Preview" }).click();
    await expect(page).toHaveURL(/view=preview/);

    await page.goBack();
    await expect(page).toHaveURL(/view=uses/);
    await page.reload();
    await expect(page).toHaveURL(/view=uses/);
    await expect(
      page.getByRole("region", { name: "Radius uses" }),
    ).toBeVisible();
  });
});

test.describe("Space, to Preview and back", () => {
  /** Focus to the page: Space is ignored while a button or a tab has it. */
  const blurFocus = (page: import("@playwright/test").Page) =>
    page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());

  test("returns Typography to the view and tab it left", async ({
    seededPage: page,
  }) => {
    await page.getByRole("button", { name: "Specimen" }).click();
    await page.getByRole("tab", { name: /^Groups/ }).click();
    await expect(page).toHaveURL(/view=specimen/);
    await expect(page).toHaveURL(/tab=groups/);

    await blurFocus(page);
    await page.keyboard.press("Space");
    await expect(page).toHaveURL(/\/preview/);

    /* And back: the address the studio was left on, not its bare path. */
    await blurFocus(page);
    await page.keyboard.press("Space");
    await expect(page).toHaveURL(/\/typography/);
    await expect(page).toHaveURL(/view=specimen/);
    await expect(page).toHaveURL(/tab=groups/);
    await expect(page.getByRole("tab", { name: /^Groups/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(
      page.getByRole("region", { name: "Type scale preview" }),
    ).toBeVisible();
  });

  test("returns a scale studio to its view", async ({ seededPage: page }) => {
    await page.goto("/radius");
    await page
      .getByRole("navigation", { name: "Scale sections" })
      .getByRole("button", { name: "Uses" })
      .click();
    await expect(page).toHaveURL(/view=uses/);

    await blurFocus(page);
    await page.keyboard.press("Space");
    await expect(page).toHaveURL(/\/preview/);
    await blurFocus(page);
    await page.keyboard.press("Space");

    await expect(page).toHaveURL(/\/radius/);
    await expect(page).toHaveURL(/view=uses/);
    await expect(
      page.getByRole("region", { name: "Radius uses" }),
    ).toBeVisible();
  });

  test("opens a studio left on its defaults on the bare path", async ({
    seededPage: page,
  }) => {
    await blurFocus(page);
    await page.keyboard.press("Space");
    await expect(page).toHaveURL(/\/preview/);
    await blurFocus(page);
    await page.keyboard.press("Space");
    await expect(page).toHaveURL(/\/typography\/?$/);
  });
});
