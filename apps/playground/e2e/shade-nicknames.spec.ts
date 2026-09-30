import type { Page } from "@playwright/test";
import { expect, readStoredWorkspace, test } from "./fixtures";

/**
 * A shade can be nicknamed from its details, and an export says the nickname
 * beside the token in place of `main` (the source shade) or `submain` (a custom
 * anchor).
 */
const sourceShade = (page: Page) =>
  page
    .getByRole("button", { name: /^Select secondary / })
    .filter({ has: page.getByLabel("Source colour") });

/** A secondary shade that is neither the source, an anchor nor overridden. */
const plainShade = (page: Page) =>
  page
    .getByRole("button", { name: /^Select secondary \d+,/ })
    .filter({
      hasNot: page.getByLabel(/Source colour|Colour anchor|Manual colour/),
    })
    .first();

const weightOf = async (shade: ReturnType<typeof sourceShade>) =>
  /^Select secondary (\d+),/.exec(
    (await shade.getAttribute("aria-label"))!,
  )![1]!;

const detailsOf = (page: Page, weight: string) =>
  page.getByRole("dialog", { name: `secondary ${weight} shade details` });

/** The CSS export's line for one secondary shade. */
async function exportedLine(page: Page, weight: string): Promise<string> {
  await page.getByRole("button", { name: "Export palette" }).click();
  await page.getByRole("button", { name: "CSS", exact: true }).click();
  const preview = page.getByRole("region", { name: "Export preview" });
  await expect(preview).toContainText(`--color-secondary-${weight}:`);
  const text = await preview.innerText();
  await page.keyboard.press("Escape");
  return text
    .split("\n")
    .find((line) => line.includes(`-secondary-${weight}:`))!;
}

test.describe("Shade nicknames", () => {
  test("say a nickname beside the token, in place of main", async ({
    seededPage: page,
  }) => {
    const source = sourceShade(page);
    const weight = await weightOf(source);

    /* With no nickname the export already says what the source is. */
    expect(await exportedLine(page, weight)).toMatch(/; \/\* main \*\/$/);

    await source.click();
    const details = detailsOf(page, weight);
    const field = details.getByLabel("Nickname");
    /* The field says what it will say, greyed, until something is typed. */
    await expect(field).toHaveAttribute("placeholder", "main");
    await expect(field).toHaveValue("");

    /* A space can be typed: the field keeps what is typed, not the cleaned copy. */
    await field.fill("brand blue");
    await expect(field).toHaveValue("brand blue");
    await field.pressSequentially(" ");
    await expect(field).toHaveValue("brand blue ");
    await details.getByRole("button", { name: "Close shade details" }).click();

    expect(await exportedLine(page, weight)).toMatch(/; \/\* brand blue \*\/$/);
    await expect
      .poll(async () => {
        const stored = await readStoredWorkspace(page);
        const track = stored.palette.tracks.find(
          (each: { id: string }) => each.id === "secondary",
        );
        return track.adjustments.labels?.[weight];
      })
      .toMatch(/^brand blue/);

    /* Cleared, it says main again, and the project carries no labels. */
    await source.click();
    await detailsOf(page, weight).getByLabel("Nickname").fill("");
    await detailsOf(page, weight)
      .getByRole("button", { name: "Close shade details" })
      .click();
    expect(await exportedLine(page, weight)).toMatch(/; \/\* main \*\/$/);
    const stored = await readStoredWorkspace(page);
    const track = stored.palette.tracks.find(
      (each: { id: string }) => each.id === "secondary",
    );
    expect("labels" in track.adjustments).toBe(false);
  });

  test("say submain for a custom anchor, and keep a nickname through an edit", async ({
    seededPage: page,
  }) => {
    const plain = plainShade(page);
    const weight = await weightOf(plain);

    /* A shade that is nothing in particular says nothing, and no placeholder. */
    await plain.click();
    let details = detailsOf(page, weight);
    await expect(details.getByLabel("Nickname")).toHaveAttribute(
      "placeholder",
      "",
    );
    await details.getByLabel("Nickname").fill("tint");

    /* Editing its colour, and then making it an anchor, are edits of the
       colour, not of the nickname: both used to rebuild the adjustments
       without it. */
    await details
      .getByRole("button", { name: `Edit secondary ${weight} colour` })
      .click();
    const hexInput = page.getByLabel(
      `secondary ${weight} manual colour HEX value`,
    );
    await hexInput.fill("#d8c65a");
    await hexInput.press("Enter");
    await expect(details.getByRole("radio", { name: "Manual" })).toBeChecked();
    await expect(details.getByLabel("Nickname")).toHaveValue("tint");
    await details.getByRole("radio", { name: "Anchor" }).click();
    await expect(details.getByRole("radio", { name: "Anchor" })).toBeChecked();
    await expect(details.getByLabel("Nickname")).toHaveValue("tint");
    await details.getByRole("button", { name: "Close shade details" }).click();
    expect(await exportedLine(page, weight)).toMatch(/; \/\* tint \*\/$/);

    /* Without the nickname it is a custom anchor, which says submain. */
    await page
      .getByRole("button", { name: `Select secondary ${weight},` })
      .click();
    details = detailsOf(page, weight);
    await expect(details.getByLabel("Nickname")).toHaveAttribute(
      "placeholder",
      "submain",
    );
    await details.getByLabel("Nickname").fill("");
    await details.getByRole("button", { name: "Close shade details" }).click();
    expect(await exportedLine(page, weight)).toMatch(/; \/\* submain \*\/$/);
  });

  test("cannot break out of the comment in an export", async ({
    seededPage: page,
  }) => {
    const source = sourceShade(page);
    const weight = await weightOf(source);
    await source.click();
    await detailsOf(page, weight)
      .getByLabel("Nickname")
      .fill("x */ body{display:none} /*");
    await detailsOf(page, weight)
      .getByRole("button", { name: "Close shade details" })
      .click();

    const line = await exportedLine(page, weight);
    /* One opener and one closer, and the closer is the last thing on the line. */
    expect(line.split("/*")).toHaveLength(2);
    expect(line.split("*/")).toHaveLength(2);
    expect(line.trimEnd().endsWith("*/")).toBe(true);
  });
});
