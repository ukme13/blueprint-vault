import { expect, test } from "./typography-fixtures";

test.describe("Typography export", () => {
  test("shows CSS and Tailwind export output", async ({ seededPage: page }) => {
    await page.getByRole("button", { name: "Export type scale" }).click();

    await expect(
      page.getByRole("heading", { name: "Export type scale" }),
    ).toBeVisible();
    await expect(page.getByText("--font-family-base:")).toBeVisible();
    await expect(page.getByText(":root {")).toBeVisible();

    await page.getByRole("button", { name: "Tailwind CSS" }).click();
    await expect(page.getByText("@theme {")).toBeVisible();
  });

  test("downloads the generated CSS file", async ({ seededPage: page }) => {
    await page.getByLabel("Project name").fill("Ferre Type");
    await page.getByRole("button", { name: "Export type scale" }).click();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download", exact: true }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe("ferre-type.css");
  });
});
