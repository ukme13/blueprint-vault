import { expect, test } from "./fixtures";

test.describe("Responsive palette workspace", () => {
  test("shows the full 25–950 ramp beside the sliders at desktop width", async ({
    seededPage: page,
  }) => {
    /* The left rail takes a column. 1540 leaves the colour bench the same
       width this assertion had at 1280 before the shell. */
    await page.setViewportSize({ width: 1540, height: 800 });

    await expect(
      page.getByRole("region", { name: "Generated colour shades" }),
    ).toBeVisible();
    await expect(
      page.getByRole("separator", { name: "Resize palette settings" }),
    ).toBeVisible();

    const layout = await page.evaluate(() => {
      const scroller = document.querySelector(
        '[data-testid="palette-matrix-scroller"]',
      );
      if (!(scroller instanceof HTMLElement)) return null;
      const weights = [
        ...scroller.querySelectorAll("header code"),
      ] as HTMLElement[];
      const scrollerBox = scroller.getBoundingClientRect();
      const visible = weights
        .filter((node) => {
          const box = node.getBoundingClientRect();
          return (
            box.left >= scrollerBox.left - 1 &&
            box.right <= scrollerBox.right + 1
          );
        })
        .map((node) => node.textContent);

      return {
        scrollWidth: scroller.scrollWidth,
        clientWidth: scroller.clientWidth,
        visible,
        last: weights.at(-1)?.textContent ?? null,
      };
    });

    expect(layout).not.toBeNull();
    expect(layout!.scrollWidth).toBeLessThanOrEqual(layout!.clientWidth + 1);
    expect(layout!.visible).toContain("25");
    expect(layout!.visible).toContain("950");
    expect(layout!.last).toBe("950");
  });

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
