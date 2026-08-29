import { expect, test } from "./typography-fixtures";

const FILE = "e2e/fixtures-files/Brand-Regular.woff2";

const registeredFamilies = (page: import("@playwright/test").Page) =>
  page.evaluate(() => {
    const names: string[] = [];
    document.fonts.forEach((face) => names.push(face.family));
    return names;
  });

test.describe("Uploaded fonts", () => {
  test("renders the scale in an uploaded file", async ({
    seededPage: page,
  }) => {
    const settings = page.getByRole("region", { name: "Type scale settings" });
    await settings.getByLabel("Upload a font file").setInputFiles(FILE);

    await expect(settings.getByText(/Rendering Brand-Regular/)).toBeVisible();
    await expect
      .poll(() => registeredFamilies(page))
      .toContain("Brand-Regular");

    const sample = page.getByLabel("Specimen text").first();
    await expect
      .poll(() => sample.evaluate((el) => getComputedStyle(el).fontFamily))
      .toContain("Brand-Regular");
  });

  test("points the entry at the file and marks it local", async ({
    seededPage: page,
  }) => {
    const settings = page.getByRole("region", { name: "Type scale settings" });
    await settings.getByLabel("Upload a font file").setInputFiles(FILE);
    await expect(settings.getByText(/Rendering Brand-Regular/)).toBeVisible();

    const entry = await page.evaluate(() => {
      const raw = window.localStorage.getItem("blueprint.workspace.v1");
      return JSON.parse(raw!).typography.system.fonts[0];
    });
    expect(entry.source).toBe("local");
    expect(entry.families[0]).toBe("Brand-Regular");
    // A generic stays behind it, so a missing file still renders.
    expect(entry.families.at(-1)).toBe("sans-serif");
  });

  test("keeps no font bytes in the project", async ({ seededPage: page }) => {
    const settings = page.getByRole("region", { name: "Type scale settings" });
    await settings.getByLabel("Upload a font file").setInputFiles(FILE);
    await expect(settings.getByText(/Rendering Brand-Regular/)).toBeVisible();

    /* The rule the whole plan hangs on. The file is 28KB, so a project holding
       it would be obvious by size alone. */
    const stored = await page.evaluate(() =>
      window.localStorage.getItem("blueprint.workspace.v1"),
    );
    expect(stored).not.toBeNull();
    expect(stored!.length).toBeLessThan(20_000);
    expect(stored).not.toContain("data");
    expect(stored).not.toContain("wOF2");
  });

  test("still renders after a reload, from the stored file", async ({
    seededPage: page,
  }) => {
    const settings = page.getByRole("region", { name: "Type scale settings" });
    await settings.getByLabel("Upload a font file").setInputFiles(FILE);
    await expect(settings.getByText(/Rendering Brand-Regular/)).toBeVisible();

    await page.reload();
    await expect(
      page.getByRole("region", { name: "Type scale settings" }),
    ).toBeVisible();

    // Nothing joins the name to the bytes but the store, so this is the store.
    await expect
      .poll(() => registeredFamilies(page))
      .toContain("Brand-Regular");
    await expect(page.getByText(/Rendering Brand-Regular/)).toBeVisible();
  });

  test("registers the family once, not once per pass", async ({
    seededPage: page,
  }) => {
    const settings = page.getByRole("region", { name: "Type scale settings" });
    await settings.getByLabel("Upload a font file").setInputFiles(FILE);
    await expect(settings.getByText(/Rendering Brand-Regular/)).toBeVisible();

    const families = await registeredFamilies(page);
    expect(families.filter((name) => name === "Brand-Regular")).toHaveLength(1);
  });

  test("says nothing about Google or Thai coverage for a file it was handed", async ({
    seededPage: page,
  }) => {
    const settings = page.getByRole("region", { name: "Type scale settings" });
    await settings.getByLabel("Upload a font file").setInputFiles(FILE);
    await expect(settings.getByText(/Rendering Brand-Regular/)).toBeVisible();

    /* Both notes reason from the Google catalogue. "Not loaded here" would
       contradict the line directly above it. */
    await expect(settings.getByText(/is not a Google font/)).toHaveCount(0);
    await expect(settings.getByText(/has no Thai glyphs/)).toHaveCount(0);
  });
});
