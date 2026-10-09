import { expect, test } from "@playwright/test";

/**
 * WebKit only: run with `pnpm e2e:webkit` (needs `playwright install webkit`).
 *
 * On an iPhone the New project sheet opened with its row of templates
 * squeezed to a sliver: the cards sat below an empty strip, out of sight. The
 * row's cards were sized from a container query, and WebKit measures a
 * hugging sheet before a container's size is known, so the row came out as
 * its padding alone. Chromium lays the same page out correctly, so nothing
 * in the Chromium suite could see it.
 */
test("the New project sheet's row of templates is as tall as its cards", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.reload();
  await page.getByRole("button", { name: "New project", exact: true }).click();

  const sheet = page.getByRole("dialog", { name: "New project" });
  await expect(sheet).toBeVisible();
  const card = sheet
    .getByRole("radio")
    .first()
    .locator("xpath=ancestor::label[1]");
  await expect(card).toBeVisible();

  /* Let the sheet finish arriving, then measure. */
  await expect
    .poll(async () => {
      const row = (await sheet
        .locator("[class*='galleryScroll']")
        .boundingBox())!;
      const last = (await sheet
        .getByRole("radio")
        .nth(1)
        .locator("xpath=ancestor::label[1]")
        .boundingBox())!;
      return Math.round(row.y + row.height - (last.y + last.height));
    })
    .toBeGreaterThanOrEqual(0);

  const first = (await card.boundingBox())!;
  expect(first.height).toBeGreaterThan(100);
  expect(first.width).toBeGreaterThan(200);
});
