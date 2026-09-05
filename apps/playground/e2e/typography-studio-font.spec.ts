import { expect, test } from "./typography-fixtures";

/*
 * The studio's typeface and the client's are two different fonts on one
 * screen, and this is the seam between them.
 *
 * Everything the tool draws for itself — headings, labels, buttons, the
 * chrome around the scale — is set in the studio font, one `--font-sans`
 * shared by both apps. Everything the tool draws *of the client's system* is
 * set in the client's own stack, whatever they picked in the settings panel.
 * The typography studio is the one screen where both appear at once, inches
 * apart, which is exactly where a regression would hide: point the specimen
 * at `--font-sans` and every scale still renders, still measures, still
 * exports — in the wrong typeface, showing the client our font and calling it
 * theirs.
 *
 * Computed `font-family` reports the declared list rather than the face that
 * won, and that is the right thing to assert here. The question is not which
 * file the browser opened, it is which stack the element was told to use.
 */

/** The studio's own stack, as the app variables resolve it. */
const studioSans = (page: import("@playwright/test").Page) =>
  page.evaluate(() =>
    getComputedStyle(document.documentElement)
      .getPropertyValue("--font-sans")
      .trim(),
  );

test.describe("The studio's font and the client's", () => {
  test("draws the specimen in the client's stack, not ours", async ({
    seededPage: page,
  }) => {
    const steps = page.getByRole("region", { name: "Generated type steps" });
    const specimen = steps.getByLabel("Specimen text").first();

    /* The seeded project's own stack, quoted as CSS wants it. Nothing in this
       list is the studio font, and none of it came from `--font-sans`. */
    await expect(specimen).toHaveCSS(
      "font-family",
      '"Geist Sans", ui-sans-serif, system-ui',
    );

    const ours = await studioSans(page);
    expect(ours).not.toBe("");
    const declared = await specimen.evaluate(
      (el) => getComputedStyle(el).fontFamily,
    );
    /* Inter is ours. If it has reached the specimen, the client's choice has
       stopped being the thing on screen. */
    expect(declared).not.toContain("Inter");
    expect(declared).not.toBe(ours);
  });

  test("draws its own chrome in ours, on the same screen", async ({
    seededPage: page,
  }) => {
    const ours = await studioSans(page);
    const heading = page
      .getByRole("region", { name: "Type scale settings" })
      .getByRole("heading")
      .first();

    /* The studio stack begins with next/font's generated Inter family, so a
       heading drawn in it starts with the same family the variable does. */
    const first = (stack: string) =>
      stack
        .split(",")[0]!
        .trim()
        .replace(/^["']|["']$/g, "");
    await expect
      .poll(() => heading.evaluate((el) => getComputedStyle(el).fontFamily))
      .toContain(first(ours));
  });
});
