import { readFileSync } from "node:fs";
import { expect, test } from "./fixtures";
import type { Page } from "@playwright/test";

/**
 * Download a report and read the file.
 *
 * The file rather than the preview, because the preview is a CodeBlock that
 * renders a language label and line numbers around the text — scraping it
 * gives something that is not the document. That mistake cost two rounds when
 * the workspace file format was tested, and the download is the path a person
 * uses anyway.
 */
async function downloadReport(page: Page, format: string) {
  /* Opened only if it is not already, so a test can take two formats in one
     go. Downloading does not close the dialog, and clicking the trigger again
     lands on the modal backdrop instead. */
  const preview = page.getByRole("region", { name: "Export preview" });
  if (!(await preview.isVisible())) {
    await page.getByRole("button", { name: "Export palette" }).click();
  }
  await page.getByRole("button", { name: format }).click();
  await expect(
    page.getByRole("region", { name: "Export preview" }),
  ).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download" }).click();
  const download = await downloadPromise;

  return {
    filename: download.suggestedFilename(),
    text: readFileSync(await download.path(), "utf8"),
  };
}

test.describe("The accessibility report", () => {
  test("offers both formats in the export dialog", async ({
    seededPage: page,
  }) => {
    await page.getByRole("button", { name: "Export palette" }).click();

    await expect(
      page.getByRole("button", { name: "Report (Markdown)" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Report (JSON)" }),
    ).toBeVisible();
  });

  test("hides the colour format switch, which a report has no use for", async ({
    seededPage: page,
  }) => {
    /* Every value in a report is a measurement, and a ratio has no hex
       notation. Leaving the switch there would offer a choice that changes
       nothing. */
    await page.getByRole("button", { name: "Export palette" }).click();
    await expect(page.getByLabel("Export colour format")).toBeVisible();

    await page.getByRole("button", { name: "Report (Markdown)" }).click();
    await expect(page.getByLabel("Export colour format")).toBeHidden();
  });

  test("downloads a Markdown report with every section", async ({
    seededPage: page,
  }) => {
    const { filename, text } = await downloadReport(page, "Report (Markdown)");

    expect(filename).toMatch(/-accessibility\.md$/);
    expect(text).toContain("# Accessibility report");
    expect(text).toContain("## Text contrast");
    expect(text).toContain("## Controls and focus");
    expect(text).toContain("## Colour vision");
    expect(text).toContain("## Method");
  });

  test("states the WCAG version and cites the simulation method", async ({
    seededPage: page,
  }) => {
    /* The rule the plan sets: a report whose method is unstated cannot be
       checked once the formulas underneath it change. */
    const { text } = await downloadReport(page, "Report (Markdown)");

    expect(text).toContain("WCAG 2.2");
    expect(text).toContain("Machado, Oliveira and Fernandes (2009)");
    expect(text).toContain("not a WCAG requirement");
  });

  test("names the pairs that collapse for some people", async ({
    seededPage: page,
  }) => {
    const { text } = await downloadReport(page, "Report (Markdown)");

    expect(text).toContain("Success and error");
    expect(text).toMatch(/Collapses/);
    expect(text).toMatch(/Deuteranopia/);
  });

  test("downloads a JSON report a machine can read", async ({
    seededPage: page,
  }) => {
    const { filename, text } = await downloadReport(page, "Report (JSON)");

    expect(filename).toMatch(/-accessibility\.json$/);

    const parsed = JSON.parse(text);
    expect(parsed.method.wcagVersion).toBe("WCAG 2.2");
    /* Every pair among the tokens that signal by colour, derived from the
       workspace's own layer rather than from a list in the package. */
    /* Hover, active and muted are the primary control under the pointer,
       pressed, and turned down — three ways of saying the same accent rather
       than three signals beside each other, so the report leaves them out of
       the grid. See semanticPairIds. */
    const signalling = Object.keys(parsed.colour.shades).filter(
      (id: string) =>
        /^(status|action)\./.test(id) &&
        !["action.hover", "action.active", "action.muted"].includes(id),
    ).length;
    expect(parsed.colour.semanticPairs).toHaveLength(
      (signalling * (signalling - 1)) / 2,
    );
    expect(
      parsed.colour.semanticPairs.map((pair: { label: string }) => pair.label),
    ).toContain("Success and error");
    expect(parsed.colour.textChecks.length).toBeGreaterThan(0);
  });

  test("carries no typography section without a type scale", async ({
    seededPage: page,
  }) => {
    /* The palette fixture seeds no scale, so the report should say nothing
       about type rather than inventing a default one. */
    const { text } = await downloadReport(page, "Report (JSON)");

    expect(JSON.parse(text).typography).toBeNull();
  });

  test("reports the same thing whichever way it is asked", async ({
    seededPage: page,
  }) => {
    /* Two formats of one report, not two reports. If these ever disagree the
       Markdown is being built from something other than the JSON's source. */
    const markdown = await downloadReport(page, "Report (Markdown)");
    const json = JSON.parse((await downloadReport(page, "Report (JSON)")).text);

    for (const check of json.colour.textChecks) {
      expect(markdown.text).toContain(check.label);
      expect(markdown.text).toContain(`${check.result.ratio.toFixed(2)}:1`);
    }
  });
});
