import { expect, test } from "./fixtures";

test.describe("Responsive palette workspace", () => {
  test("keeps wide palette content inside its scroller on a small screen", async ({
    seededPage: page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    const canvas = page.getByRole("region", {
      name: "Generated colour shades",
    });
    await expect(canvas).toBeVisible();

    await expect(
      page.getByRole("separator", { name: "Resize palette settings" }),
    ).toBeHidden();

    const layout = await page.evaluate(() => {
      const scroller = document.querySelector(
        '[data-testid="palette-matrix-scroller"]',
      );
      if (!(scroller instanceof HTMLElement)) return null;

      return {
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        scrollerClientWidth: scroller.clientWidth,
        scrollerWidth: scroller.scrollWidth,
      };
    });

    expect(layout).not.toBeNull();
    expect(layout!.documentWidth).toBeLessThanOrEqual(layout!.viewportWidth);
    expect(layout!.scrollerWidth).toBeGreaterThan(layout!.scrollerClientWidth);

    const settings = page.getByText("Palette settings", { exact: true });
    const canvasBox = await canvas.boundingBox();
    const settingsBox = await settings.boundingBox();

    expect(settingsBox!.y).toBeGreaterThan(canvasBox!.y);
  });
});
