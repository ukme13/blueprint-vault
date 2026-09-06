import { readFileSync } from "node:fs";
import { unzipSync, strFromU8 } from "fflate";
import { expect, test } from "./fixtures";

/*
 * The archive a client is actually handed.
 *
 * `handover.test.ts` in the package says what `buildHandoverFiles` returns.
 * This says that the bytes leaving the browser are that list — which is a
 * different claim, and the one that fails if the zip step drops a file, mangles
 * a name, or writes an archive nothing can open. Unzipped here rather than
 * inspected as a blob, because "it downloaded something" is not the assertion.
 */

/**
 * The names `buildHandoverFiles` produces for the seeded workspace.
 *
 * Seven, not eight: this fixture seeds a palette and no type scale, so there is
 * no typography stylesheet to write and the archive leaves it out rather than
 * carrying a zero-byte file. That is the case this test found — the archive
 * shipped an empty `blueprint-typography.css` until it did — so the fixture is
 * left alone and the expectation says why.
 */
const EXPECTED = [
  "blueprint.css",
  "blueprint.tailwind.css",
  "blueprint.tokens.json",
  "workspace.blueprint.json",
  "accessibility-report.md",
  "accessibility-report.json",
  "README.md",
].sort();

test.describe("the handover archive", () => {
  test("downloads as a zip holding every file the builder names", async ({
    seededPage: page,
  }) => {
    await page.getByRole("button", { name: "Export palette" }).click();
    await page.getByRole("button", { name: "Handover (.zip)" }).click();

    /* The preview is the README, which is the one file that explains the
       others — so it doubles as the check that the right format is selected. */
    await expect(
      page.getByRole("region", { name: "Export preview" }),
    ).toContainText("Your design system");

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download" }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/-handover\.zip$/);

    const bytes = readFileSync(await download.path());
    const unzipped = unzipSync(new Uint8Array(bytes));

    expect(Object.keys(unzipped).sort()).toEqual(EXPECTED);

    /* And the contents survived the round trip rather than merely the names.
       An archive of eight empty files has the right listing. */
    for (const [name, contents] of Object.entries(unzipped)) {
      expect(
        contents.length,
        `${name} is empty in the archive`,
      ).toBeGreaterThan(0);
    }

    const readme = strFromU8(unzipped["README.md"]!);
    for (const name of EXPECTED) {
      expect(
        readme,
        `${name} is in the archive and not in the README`,
      ).toContain(name);
    }
    expect(strFromU8(unzipped["blueprint.css"]!)).toContain("--color-");
  });
});
