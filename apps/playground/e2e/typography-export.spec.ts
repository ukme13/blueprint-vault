import {
  expect,
  fillHybridNumber,
  showInspectorPanel,
  test,
} from "./typography-fixtures";
import type { Page } from "@playwright/test";

/* The dialog writes the whole system, so a unit button or a media query is
   only this studio's when it is looked for inside the dialog's own parts. */
const dialogOf = (page: Page) =>
  page.getByRole("dialog", { name: "Export design system" });
const unitButton = (page: Page, unit: string) =>
  dialogOf(page)
    .getByRole("group", { name: "Type unit" })
    .getByRole("button", { name: unit, exact: true });

/** The preview from the type scale on: the palette, scales and uses come
    first and have media queries of their own. */
async function typographyText(page: Page): Promise<string> {
  const text =
    (await page
      .getByRole("region", { name: "Export preview" })
      .textContent()) ?? "";
  return text.slice(text.indexOf("--font-family-"));
}

test.describe("Typography export", () => {
  test("shows CSS and Tailwind export output", async ({ seededPage: page }) => {
    await page.getByRole("button", { name: "Export type scale" }).click();

    const dialog = dialogOf(page);
    await expect(
      dialog.getByRole("heading", { name: "Export design system" }),
    ).toBeVisible();
    await expect(dialog.getByText("--font-family-base:")).toBeVisible();
    await expect(dialog.getByText(":root {").first()).toBeVisible();

    await dialog.getByRole("button", { name: "Tailwind CSS" }).click();
    await expect(dialog.getByText("@theme static {").first()).toBeVisible();
    await expect(dialog.getByText("--font-family-base:")).toBeVisible();
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

    await unitButton(page, "pt").click();
    await expect(preview.getByText("--font-body-size: 12pt;")).toBeVisible();
    await expect(
      preview.getByText("--font-body-letter-spacing: 0em;"),
    ).toBeVisible();

    await unitButton(page, "px").click();
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
    await unitButton(page, "px").click();

    const preview = page.getByRole("region", { name: "Export preview" });
    await expect(preview.getByText("clamp(14px,")).toBeVisible();
    const css = await typographyText(page);
    expect(css).toContain("@media (min-width: 768px)");
    expect(css).toContain("clamp(18px,");
    expect(css).toContain("20px)");
    expect(css).not.toContain("@media (min-width: 1120px)");
  });

  test("downloads the generated CSS file", async ({ seededPage: page }) => {
    await page.getByLabel("Project name").fill("Ferre Type");
    await page.getByLabel("Project name").blur();
    await page.getByRole("button", { name: "Export type scale" }).click();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download", exact: true }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe("ferre-type.css");
  });
});
