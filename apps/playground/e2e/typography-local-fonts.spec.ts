import { expect, test } from "./typography-fixtures";

const FILE = "e2e/fixtures-files/Brand-Regular.woff2";
/* A second file, because a stack dedupes its families: the same file in two
   slots is one family, and the entry this describes — an uploaded Latin face
   in front of an uploaded Thai one — needs two of them to exist at all. */
const THAI_FILE = "e2e/fixtures-files/Brand-Thai.woff2";

/*
 * The upload inputs are named per slot now, so two of them can sit in one
 * entry without a screen reader hearing "upload, upload". The seeded project
 * migrates to a single entry called "Base".
 */
const PRIMARY_UPLOAD = "Upload Base font file";
const PRIMARY_REPLACE = "Replace Base font file";
const PRIMARY_ADD_MISSING = "Add the missing Base font file";
const FALLBACK_UPLOAD = "Upload Base fallback 1 file";
const FALLBACK_REPLACE = "Replace Base fallback 1 file";

/** The first font entry as the workspace has it stored, not as state has it. */
const storedEntry = (page: import("@playwright/test").Page) =>
  page.evaluate(() => {
    const raw = window.localStorage.getItem("blueprint.workspace.v1");
    return JSON.parse(raw!).typography.system.fonts[0];
  });

/**
 * Open the bilingual fallback slot.
 *
 * Its picker and upload field are behind a button until somebody asks for
 * them, so the upload input does not exist until this runs.
 */
async function openFallback(scope: import("@playwright/test").Locator) {
  const add = scope.getByRole("button", { name: /^Add a fallback to / });
  if ((await add.count()) > 0) await add.first().click();
}

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
    await settings.getByLabel(PRIMARY_UPLOAD).setInputFiles(FILE);

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
    await settings.getByLabel(PRIMARY_UPLOAD).setInputFiles(FILE);
    await expect(settings.getByText(/Rendering Brand-Regular/)).toBeVisible();

    const entry = await page.evaluate(() => {
      const raw = window.localStorage.getItem("blueprint.workspace.v1");
      return JSON.parse(raw!).typography.system.fonts[0];
    });
    expect(entry.sources).toEqual({ primary: "local" });

    /* The upload replaces the primary slot and nothing else. The seed is
       "Geist Sans, ui-sans-serif, system-ui", so the two behind it survive —
       they used to be thrown away for a hardcoded ["family", "sans-serif"],
       which is what deleted a bilingual fallback along with them.

       The tail is still a generic, so a missing file renders; it is the
       project's own generic rather than one this code chose. */
    expect(entry.families).toEqual([
      "Brand-Regular",
      "ui-sans-serif",
      "system-ui",
    ]);
  });

  test("keeps no font bytes in the project", async ({ seededPage: page }) => {
    const settings = page.getByRole("region", { name: "Type scale settings" });
    await settings.getByLabel(PRIMARY_UPLOAD).setInputFiles(FILE);
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
    await settings.getByLabel(PRIMARY_UPLOAD).setInputFiles(FILE);
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
    await settings.getByLabel(PRIMARY_UPLOAD).setInputFiles(FILE);
    await expect(settings.getByText(/Rendering Brand-Regular/)).toBeVisible();

    const families = await registeredFamilies(page);
    expect(families.filter((name) => name === "Brand-Regular")).toHaveLength(1);
  });

  test("says nothing about Google or Thai coverage for a file it was handed", async ({
    seededPage: page,
  }) => {
    const settings = page.getByRole("region", { name: "Type scale settings" });
    await settings.getByLabel(PRIMARY_UPLOAD).setInputFiles(FILE);
    await expect(settings.getByText(/Rendering Brand-Regular/)).toBeVisible();

    /* Both notes reason from the Google catalogue. "Not loaded here" would
       contradict the line directly above it. */
    await expect(settings.getByText(/is not a Google font/)).toHaveCount(0);
    await expect(settings.getByText(/has no Thai glyphs/)).toHaveCount(0);
  });
});

test.describe("An upload in each slot", () => {
  /* The feature per-slot sources exist for: an uploaded Latin face in front of
     an uploaded Thai one. One `source` for the entry could not describe it,
     and one storage key could not hold both files. */
  test("keeps both files, under a key each", async ({ seededPage: page }) => {
    const settings = page.getByRole("region", { name: "Type scale settings" });

    await settings.getByLabel(PRIMARY_UPLOAD).setInputFiles(FILE);
    await expect(settings.getByLabel(PRIMARY_REPLACE)).toBeVisible();
    await openFallback(settings);
    await settings.getByLabel(FALLBACK_UPLOAD).setInputFiles(THAI_FILE);
    /* The same signal the primary is waited on for above: a slot offers to
       replace its file once it has one. Without it the read below raced the
       upload it was reading the result of. */
    await expect(settings.getByLabel(FALLBACK_REPLACE)).toBeVisible();

    /* Polled rather than read once. Storage is written by an effect, so it
       lands a beat after the render that changed the label above — near
       enough to pass alone and to fail under load, which is the worst of
       both. */
    await expect
      .poll(() => storedEntry(page).then((entry) => entry.sources))
      .toEqual({ primary: "local", fallback: "local" });

    /* Two files, two families, in the order they were uploaded. What matters
       is that neither slot overwrote the other's source or its family. */
    expect((await storedEntry(page)).families.slice(0, 2)).toEqual([
      "Brand-Regular",
      "Brand-Thai",
    ]);
  });

  test("a fallback upload leaves the primary alone", async ({
    seededPage: page,
  }) => {
    const settings = page.getByRole("region", { name: "Type scale settings" });

    await settings.getByLabel(PRIMARY_UPLOAD).setInputFiles(FILE);
    await expect(settings.getByLabel(PRIMARY_REPLACE)).toBeVisible();

    /* The bug this whole change exists to make impossible: before slots, the
       one upload input rewrote the entire stack. */
    await openFallback(settings);
    await settings.getByLabel(FALLBACK_UPLOAD).setInputFiles(THAI_FILE);

    await expect(settings.getByLabel(PRIMARY_REPLACE)).toBeVisible();
  });
});

test.describe("A local font with no file", () => {
  /* What another browser sees: the project names a local family, and the store
     it was uploaded to is not this one. */
  const seedLocalWithoutFile = async (
    page: import("@playwright/test").Page,
  ) => {
    await page.evaluate(() => {
      const raw = window.localStorage.getItem("blueprint.workspace.v1");
      const workspace = JSON.parse(raw!);
      workspace.typography.system.fonts[0] = {
        ...workspace.typography.system.fonts[0],
        families: ["Brand-Regular", "sans-serif"],
        sources: { primary: "local" },
      };
      window.localStorage.setItem(
        "blueprint.workspace.v1",
        JSON.stringify(workspace),
      );
    });
    await page.reload();
    await expect(
      page.getByRole("region", { name: "Type scale settings" }),
    ).toBeVisible();
  };

  test("says the file is missing rather than pretending it rendered", async ({
    seededPage: page,
  }) => {
    await seedLocalWithoutFile(page);
    const settings = page.getByRole("region", { name: "Type scale settings" });

    await expect(
      settings.getByText(/Brand-Regular has no file in this browser/),
    ).toBeVisible();
    await expect(settings.getByText(/Rendering Brand-Regular/)).toHaveCount(0);
  });

  test("keeps the family name applied, so the scale is unchanged", async ({
    seededPage: page,
  }) => {
    await seedLocalWithoutFile(page);
    /* The name still applies wherever the font happens to be installed, and
       the generic behind it renders where it is not. */
    const sample = page.getByLabel("Specimen text").first();
    await expect
      .poll(() => sample.evaluate((el) => getComputedStyle(el).fontFamily))
      .toContain("Brand-Regular");
  });

  test("offers to add the file rather than to replace it", async ({
    seededPage: page,
  }) => {
    await seedLocalWithoutFile(page);
    const settings = page.getByRole("region", { name: "Type scale settings" });
    await expect(settings.getByLabel(PRIMARY_ADD_MISSING)).toBeVisible();
    await expect(settings.getByLabel(PRIMARY_REPLACE)).toHaveCount(0);
  });

  test("renders once the file is added back", async ({ seededPage: page }) => {
    await seedLocalWithoutFile(page);
    const settings = page.getByRole("region", { name: "Type scale settings" });

    await settings.getByLabel(PRIMARY_ADD_MISSING).setInputFiles(FILE);

    await expect(settings.getByText(/Rendering Brand-Regular/)).toBeVisible();
    await expect(settings.getByText(/has no file in this browser/)).toHaveCount(
      0,
    );
    await expect(settings.getByLabel(PRIMARY_REPLACE)).toBeVisible();
  });

  test("survives the reload after being added back", async ({
    seededPage: page,
  }) => {
    await seedLocalWithoutFile(page);
    await page
      .getByRole("region", { name: "Type scale settings" })
      .getByLabel(PRIMARY_ADD_MISSING)
      .setInputFiles(FILE);
    await expect(page.getByText(/Rendering Brand-Regular/)).toBeVisible();

    await page.reload();
    await expect(
      page.getByRole("region", { name: "Type scale settings" }),
    ).toBeVisible();
    await expect(page.getByText(/Rendering Brand-Regular/)).toBeVisible();
  });
});

test.describe("Exporting a scale that uses an uploaded font", () => {
  test("emits the family name and no font data", async ({
    seededPage: page,
  }) => {
    const settings = page.getByRole("region", { name: "Type scale settings" });
    await settings.getByLabel(PRIMARY_UPLOAD).setInputFiles(FILE);
    await expect(settings.getByText(/Rendering Brand-Regular/)).toBeVisible();

    await page.getByRole("button", { name: "Export type scale" }).click();
    const preview = page.getByRole("region", { name: "Export preview" });
    await expect(preview).toBeVisible();

    const css = (await preview.textContent()) ?? "";
    expect(css).toContain("Brand-Regular");
    /* Bytes in, names out. A desktop licence commonly does not cover webfont
       embedding, so the file must not travel with the stylesheet. */
    expect(css).not.toContain("@font-face");
    expect(css).not.toContain("base64");
    expect(css).not.toContain("data:font");
  });

  test("says the file is not included and the licence is the user's to check", async ({
    seededPage: page,
  }) => {
    const settings = page.getByRole("region", { name: "Type scale settings" });
    await settings.getByLabel(PRIMARY_UPLOAD).setInputFiles(FILE);
    await expect(settings.getByText(/Rendering Brand-Regular/)).toBeVisible();

    await page.getByRole("button", { name: "Export type scale" }).click();
    await expect(page.getByText(/does not include the file/)).toBeVisible();
    await expect(
      page.getByText(/check your licence covers the web/),
    ).toBeVisible();
  });

  test("says nothing about licences when no font was uploaded", async ({
    seededPage: page,
  }) => {
    await page.getByRole("button", { name: "Export type scale" }).click();
    await expect(
      page.getByRole("region", { name: "Export preview" }),
    ).toBeVisible();
    // A Google or system family is the reader's to load; not our question.
    await expect(page.getByText(/check your licence/)).toHaveCount(0);
  });
});

test.describe("A file nothing references", () => {
  /* Read the store directly. Nothing in the UI can see an orphan — the entry
     is gone, so every screen reports the font as absent whether or not its
     bytes are still sitting there. */
  const storedFontIds = (page: import("@playwright/test").Page) =>
    page.evaluate(
      () =>
        new Promise<string[]>((resolve) => {
          const open = indexedDB.open("blueprint-fonts", 1);
          open.onsuccess = () => {
            const db = open.result;
            if (!db.objectStoreNames.contains("font-data")) {
              db.close();
              resolve([]);
              return;
            }
            const keys = db
              .transaction("font-data", "readonly")
              .objectStore("font-data")
              .getAllKeys();
            keys.onsuccess = () => {
              resolve(keys.result as string[]);
              db.close();
            };
          };
          open.onerror = () => resolve([]);
        }),
    );

  const upload = async (page: import("@playwright/test").Page) => {
    const settings = page.getByRole("region", { name: "Type scale settings" });
    await settings.getByLabel(PRIMARY_UPLOAD).setInputFiles(FILE);
    await expect(settings.getByText(/Rendering Brand-Regular/)).toBeVisible();
    await expect.poll(() => storedFontIds(page)).toContain("base::primary");
  };

  test("goes when its font entry is removed", async ({ seededPage: page }) => {
    await upload(page);
    const settings = page.getByRole("region", { name: "Type scale settings" });

    /* Removal is refused for the last entry, so there has to be a second one
     before the first can go. */
    await settings.getByRole("button", { name: "Add font" }).click();
    await settings.getByRole("button", { name: "Remove Base font" }).click();

    await expect.poll(() => storedFontIds(page)).not.toContain("base::primary");
  });

  test("goes when the entry switches to a Google family", async ({
    seededPage: page,
  }) => {
    await upload(page);
    const settings = page.getByRole("region", { name: "Type scale settings" });

    await settings
      .getByLabel("Base font", { exact: true })
      .locator("xpath=..")
      .getByRole("button", { name: "Clear selection" })
      .click();
    await settings.getByLabel("Base font", { exact: true }).fill("Lora");
    await page.getByRole("option", { name: "Lora", exact: true }).click();

    await expect.poll(() => storedFontIds(page)).not.toContain("base::primary");
  });

  test("goes when the whole project is started again", async ({
    seededPage: page,
  }) => {
    await upload(page);
    await page.getByRole("button", { name: "New project" }).click();
    await page.getByRole("button", { name: "Start new project" }).click();

    await expect.poll(() => storedFontIds(page)).toEqual([]);
  });
});

test.describe("A file that is not a font", () => {
  test("is refused, and says why rather than failing silently", async ({
    seededPage: page,
  }) => {
    const settings = page.getByRole("region", { name: "Type scale settings" });
    await settings.getByLabel(PRIMARY_UPLOAD).setInputFiles({
      name: "holiday.mp4",
      mimeType: "video/mp4",
      buffer: Buffer.from([0, 1, 2, 3]),
    });

    await expect(
      settings.getByText(/holiday\.mp4 is not a font file/),
    ).toBeVisible();
    // And nothing was stored or applied.
    await expect(settings.getByText(/Rendering/)).toHaveCount(0);
  });

  test("leaves an existing font alone when the replacement is refused", async ({
    seededPage: page,
  }) => {
    const settings = page.getByRole("region", { name: "Type scale settings" });
    await settings.getByLabel(PRIMARY_UPLOAD).setInputFiles(FILE);
    await expect(settings.getByText(/Rendering Brand-Regular/)).toBeVisible();

    await settings.getByLabel(PRIMARY_REPLACE).setInputFiles({
      name: "notes.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("not a font"),
    });

    await expect(
      settings.getByText(/notes\.txt is not a font file/),
    ).toBeVisible();
    /* The refusal must not cost the font that was already working. */
    await expect(settings.getByText(/Rendering Brand-Regular/)).toBeVisible();
  });
});

test.describe("Uploading from the font selector", () => {
  /*
   * The upload control lives in the selector's menu now. The Astryx Typeahead
   * has no header slot, so the row is an item like any other — which is what
   * makes these worth pinning down: that it sits above the catalogue, that the
   * search cannot filter it away, and that choosing it uploads rather than
   * being taken for a family.
   *
   * A selected family renders as a token button with the input behind it, so
   * the menu is opened by clicking the token rather than the field.
   */
  const openPicker = async (
    page: import("@playwright/test").Page,
    family: string,
  ) => {
    const settings = page.getByRole("region", { name: "Type scale settings" });
    const input = settings.getByLabel("Base font", { exact: true });
    await input
      .locator("xpath=..")
      .getByRole("button", { name: family, exact: true })
      .click();
    return { settings, input };
  };

  test("pins the upload row above the catalogue", async ({
    seededPage: page,
  }) => {
    const { input } = await openPicker(page, "Geist Sans");
    /* Cleared to the whole catalogue: the seeded family is not a Google font,
       so searching for it matches nothing and would prove only that the row
       survives an empty result — which is the next test. */
    await input.fill("");

    const options = page.getByRole("option");
    await expect(options.first()).toHaveText(/Upload font/);
    // Above a catalogue that is actually there, not above an empty menu.
    await expect(options).not.toHaveCount(1);
  });

  test("keeps the row when the search matches no family", async ({
    seededPage: page,
  }) => {
    const { input } = await openPicker(page, "Geist Sans");
    await input.fill("Nothingcalledthis");

    /* Finding out a font is not in the catalogue is exactly the moment someone
       needs this row, so the search that proves it must not be the search that
       removes it. */
    const options = page.getByRole("option");
    await expect(options).toHaveCount(1);
    await expect(options.first()).toHaveText(/Upload font/);
  });

  test("uploads the picked file rather than selecting a family", async ({
    seededPage: page,
  }) => {
    const { settings } = await openPicker(page, "Geist Sans");

    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("option").first().click();
    await (await chooser).setFiles(FILE);

    await expect(settings.getByText(/Rendering Brand-Regular/)).toBeVisible();
  });

  test("says replace once the slot holds a file", async ({
    seededPage: page,
  }) => {
    const settings = page.getByRole("region", { name: "Type scale settings" });
    await settings.getByLabel(PRIMARY_UPLOAD).setInputFiles(FILE);
    await expect(settings.getByText(/Rendering Brand-Regular/)).toBeVisible();

    await openPicker(page, "Brand-Regular");
    // The row carries the same state the hidden input's label does.
    await expect(page.getByRole("option").first()).toHaveText(/Replace font/);
  });
});
