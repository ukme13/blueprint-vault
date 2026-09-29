import { expect, test } from "./fixtures";

/*
 * The Button page's two tables, the variant grid and the props, each in a
 * card. The layout's container padding once reached into those cards and
 * Astryx's table wrapper pulled itself 16px left by it, so both tables sat
 * off centre. Each is checked for the same inset on all four sides.
 */

for (const [name, width] of [
  ["desktop", 1280],
  ["phone", 390],
] as const) {
  test(`centres each table in its card, with even padding, on ${name}`, async ({
    page,
  }) => {
    /* On a phone the page's tables bleed to the screen's edges; in a card
     that would run them out of it. */
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/docs/button");
    const wrappers = page.locator(".astryx-table-scroll-wrapper");
    await expect(wrappers).toHaveCount(2);

    const insets = await wrappers.evaluateAll((nodes) =>
      nodes.map((wrapper) => {
        const card = wrapper.parentElement!;
        const css = getComputedStyle(card);
        const box = card.getBoundingClientRect();
        const inner = {
          left: box.left + parseFloat(css.borderLeftWidth),
          right: box.right - parseFloat(css.borderRightWidth),
          top: box.top + parseFloat(css.borderTopWidth),
          bottom: box.bottom - parseFloat(css.borderBottomWidth),
        };
        const table = wrapper.getBoundingClientRect();
        return [
          table.left - inner.left,
          inner.right - table.right,
          table.top - inner.top,
          inner.bottom - table.bottom,
        ].map(Math.round);
      }),
    );

    for (const [left, right, top, bottom] of insets) {
      expect(left).toBe(right);
      expect(top).toBe(bottom);
      expect(left).toBe(top);
      expect(left).toBeGreaterThan(0);
    }
  });
}
