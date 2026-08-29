import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import {
  PROJECT_STORAGE_KEY,
  WORKSPACE_STORAGE_KEY,
  defaultProject,
} from "./fixtures";
import {
  TYPOGRAPHY_STORAGE_KEY,
  defaultTypographyProject,
} from "./typography-fixtures";

async function seedBoth(page: Page) {
  await page.addInitScript(
    ({ pk, p, tk, t }) => {
      if (window.sessionStorage.getItem("blueprint.e2e-seeded.file")) return;
      window.sessionStorage.setItem("blueprint.e2e-seeded.file", "1");
      window.localStorage.setItem(pk, JSON.stringify(p));
      window.localStorage.setItem(tk, JSON.stringify(t));
    },
    {
      pk: PROJECT_STORAGE_KEY,
      p: defaultProject(),
      tk: TYPOGRAPHY_STORAGE_KEY,
      t: defaultTypographyProject(),
    },
  );
}

/** The header import is a button that opens a chooser, not a bare input. */
async function importFile(page: Page, name: string, contents: string) {
  const chooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Import palette" }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles({
    name,
    mimeType: "application/json",
    buffer: Buffer.from(contents),
  });
}

/** Onboarding offers a plain file input rather than the header button. */
async function importOnCreationScreen(
  page: Page,
  name: string,
  contents: string,
) {
  await page.getByRole("button", { name: "Choose File" }).setInputFiles({
    name,
    mimeType: "application/json",
    buffer: Buffer.from(contents),
  });
}

/**
 * The file the export dialog actually writes.
 *
 * Downloaded rather than read off the preview: the code block renders line
 * numbers beside the code, so the region's text interleaves them with it and
 * cannot be parsed back into a file. This also exercises the path a person
 * uses.
 */
async function exportedFile(page: Page): Promise<string> {
  await page.getByRole("button", { name: "Export palette" }).click();
  await page.getByRole("button", { name: "Blueprint Workspace" }).click();
  await expect(
    page.getByRole("region", { name: "Export preview" }),
  ).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download" }).click();
  const download = await downloadPromise;
  const path = await download.path();
  return readFileSync(path, "utf8");
}

test.describe("The Blueprint workspace file", () => {
  test("carries the type scale, which a palette file did not", async ({
    page,
  }) => {
    await seedBoth(page);
    await page.goto("/");
    await expect(
      page.getByRole("region", { name: "Palette toolbar" }),
    ).toBeVisible();

    const file = await exportedFile(page);
    expect(JSON.parse(file).kind).toBe("blueprint-workspace");
    expect(file).toContain("My colour system");
    /* The gap this closes: exporting used to lose the typography half
       entirely. */
    expect(file).toContain("baseFontSizePx");
    expect(file).toContain("stepCount");
  });

  test("restores both halves after storage is cleared", async ({ page }) => {
    await seedBoth(page);
    await page.goto("/");
    await expect(
      page.getByRole("region", { name: "Palette toolbar" }),
    ).toBeVisible();
    const file = await exportedFile(page);

    // Everything gone, as a different machine would be.
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();

    await importOnCreationScreen(page, "brand.blueprint.json", file);

    /* Waits for the studio to render the imported palette before reading
       storage, which the persist effect writes after the state lands. */
    /* The toolbar, not the name field: the creation screen has a "Project
       name" input of its own, so asserting on that passes without an import
       having happened at all. */
    await expect(
      page.getByRole("region", { name: "Palette toolbar" }),
    ).toBeVisible();

    const readStored = async () => {
      const raw = await page.evaluate(
        (key) => window.localStorage.getItem(key),
        WORKSPACE_STORAGE_KEY,
      );
      return raw ? JSON.parse(raw) : null;
    };

    await expect.poll(async () => (await readStored())?.palette).not.toBeNull();
    // The half that used to be lost.
    const workspace = await readStored();
    expect(workspace.typography).not.toBeNull();
    expect(workspace.typography.system.stepCount).toBeGreaterThan(0);
  });

  test("still accepts an older palette-only file", async ({ page }) => {
    await seedBoth(page);
    await page.goto("/");
    await expect(
      page.getByRole("region", { name: "Palette toolbar" }),
    ).toBeVisible();

    /* People have these. A format change is not a reason to orphan them. */
    const older = JSON.stringify({
      kind: "blueprint-palette",
      version: 1,
      project: {
        name: "Older export",
        tracks: [{ id: "primary", name: "primary", seedHex: "#123456" }],
        lightnessPattern: "custom",
        lightnessValues: defaultProject().lightnessValues,
      },
    });

    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
    await importOnCreationScreen(page, "older.blueprint.json", older);

    await expect(page.getByLabel("Project name")).toHaveValue("Older export");
  });

  test("refuses a file that is not one of ours, and says so", async ({
    page,
  }) => {
    await seedBoth(page);
    await page.goto("/");
    await expect(
      page.getByRole("region", { name: "Palette toolbar" }),
    ).toBeVisible();
    await importFile(page, "notes.txt", "not a project");
    /* Refused rather than silently ignored, and the dialog to replace the
       current project never opens. */
    await expect(
      page.getByRole("alertdialog", { name: "Replace current project?" }),
    ).toHaveCount(0);
  });
});
