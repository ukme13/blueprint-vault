import {
  expect,
  fillHybridNumber,
  showInspectorPanel,
  test,
} from "./typography-fixtures";

test.describe("Typography export", () => {
  test("shows CSS and Tailwind export output", async ({ seededPage: page }) => {
    await page.getByRole("button", { name: "Export type scale" }).click();

    await expect(
      page.getByRole("heading", { name: "Export type scale" }),
    ).toBeVisible();
    await expect(page.getByText("--font-family-base:")).toBeVisible();
    await expect(page.getByText(":root {")).toBeVisible();

    await page.getByRole("button", { name: "Tailwind CSS" }).click();
    await expect(page.getByText("@theme static {")).toBeVisible();
  });

  test("exports rem by default and switches unit on request", async ({
    seededPage: page,
  }) => {
    await page.getByRole("button", { name: "Export type scale" }).click();

    const preview = page.getByRole("region", { name: "Export preview" });
    await expect(preview.getByText("--font-body-size: 1rem;")).toBeVisible();
    await expect(
      preview.getByText("--font-body-letter-spacing: 0em;"),
    ).toBeVisible();

    await page.getByRole("button", { name: "pt", exact: true }).click();
    await expect(preview.getByText("--font-body-size: 12pt;")).toBeVisible();
    await expect(
      preview.getByText("--font-body-letter-spacing: 0em;"),
    ).toBeVisible();

    await page.getByRole("button", { name: "px", exact: true }).click();
    await expect(preview.getByText("--font-body-size: 16px;")).toBeVisible();
    await expect(
      preview.getByText("--font-body-letter-spacing: 0em;"),
    ).toBeVisible();
  });

  test("divides rem by a configured root", async ({ seededPage: page }) => {
    const root = page
      .getByRole("region", { name: "Generated type steps" })
      .getByLabel("rem root");
    await root.fill("18");
    await root.blur();

    await page.getByRole("button", { name: "Export type scale" }).click();

    const preview = page.getByRole("region", { name: "Export preview" });
    await expect(
      preview.getByText("--font-body-size: 0.8889rem;"),
    ).toBeVisible();
    await expect(
      preview.getByText("Lengths in rem assume html { font-size: 18px }."),
    ).toBeVisible();
  });

  test("interpolates body size with clamp between preview frames", async ({
    seededPage: page,
  }) => {
    await showInspectorPanel(page, "Groups");
    const devices = page.getByRole("navigation", { name: "Preview devices" });

    await devices.getByRole("button", { name: "Phone" }).click();
    await fillHybridNumber(page, "body size", "14");

    await devices.getByRole("button", { name: "Tablet" }).click();
    await fillHybridNumber(page, "body size", "18");

    await devices.getByRole("button", { name: "Desktop", exact: true }).click();
    await fillHybridNumber(page, "body size", "20");

    await page.getByRole("button", { name: "Export type scale" }).click();
    await page.getByRole("button", { name: "px", exact: true }).click();

    const preview = page.getByRole("region", { name: "Export preview" });
    await expect(preview.getByText("clamp(14px,")).toBeVisible();
    await expect(preview.getByText("@media (min-width: 768px)")).toBeVisible();
    await expect(preview.getByText("clamp(18px,")).toBeVisible();
    await expect(preview.getByText("20px)")).toBeVisible();
    await expect(preview.getByText("@media (min-width: 1120px)")).toHaveCount(
      0,
    );
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
