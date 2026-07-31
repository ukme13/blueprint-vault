import { expect, test } from "./fixtures";

test.describe("Resizable Palette Settings panel", () => {
  test("defaults to 350px", async ({ seededPage: page }) => {
    const panel = page.locator("aside");
    const box = await panel.boundingBox();

    expect(box?.width).toBeCloseTo(350, 0);
  });

  test("Home and End snap to the min and max width", async ({
    seededPage: page,
  }) => {
    const handle = page.getByRole("separator", {
      name: "Resize palette settings",
    });
    const panel = page.locator("aside");

    await handle.focus();
    await handle.press("Home");
    await expect(async () => {
      const box = await panel.boundingBox();
      expect(box?.width).toBeCloseTo(300, 0);
    }).toPass();

    await handle.press("End");
    await expect(async () => {
      const box = await panel.boundingBox();
      expect(box?.width).toBeCloseTo(560, 0);
    }).toPass();
  });

  test("arrow keys nudge the width by 10px", async ({ seededPage: page }) => {
    const handle = page.getByRole("separator", {
      name: "Resize palette settings",
    });
    const panel = page.locator("aside");

    const before = (await panel.boundingBox())!.width;
    await handle.focus();
    await handle.press("ArrowLeft");

    await expect(async () => {
      const box = await panel.boundingBox();
      expect(box?.width).toBeCloseTo(before + 10, 0);
    }).toPass();
  });

  test("dragging the handle resizes the panel and persists across reload", async ({
    seededPage: page,
  }) => {
    const handle = page.getByRole("separator", {
      name: "Resize palette settings",
    });
    const panel = page.locator("aside");

    const handleBox = (await handle.boundingBox())!;
    const before = (await panel.boundingBox())!.width;

    await page.mouse.move(
      handleBox.x + handleBox.width / 2,
      handleBox.y + handleBox.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      handleBox.x + handleBox.width / 2 - 40,
      handleBox.y + handleBox.height / 2,
    );
    await page.mouse.up();

    const after = (await panel.boundingBox())!.width;
    expect(after).toBeGreaterThan(before);

    await page.reload();

    const persisted = (await panel.boundingBox())!.width;
    expect(persisted).toBeCloseTo(after, 0);
  });
});
