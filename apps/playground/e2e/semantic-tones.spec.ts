import type { Locator, Page } from "@playwright/test";
import { expect, readStoredWorkspace, test } from "./fixtures";

/**
 * Tones added in one step, and seeded tones synced to the palette's locked
 * source colours.
 *
 * The rules — which weights a profile picks, which ids a family takes, what a
 * sync leaves alone — are unit tested in packages/ui. These are the studio's
 * side: the buttons, the dialogs, and that what they write lands in the layer.
 */

async function openSemantics(page: Page): Promise<Locator> {
  await page.getByRole("button", { name: "Semantics" }).click();
  const editor = page.getByRole("region", { name: "Semantic tokens" });
  await expect(editor).toBeVisible();
  return editor;
}

type StoredToken = {
  id: string;
  light: { trackId: string; weight: number };
  dark: { trackId: string; weight: number };
};

async function storedTokens(page: Page): Promise<StoredToken[]> {
  const workspace = await readStoredWorkspace(page);
  return workspace?.semantics ?? [];
}

test.describe("Tones", () => {
  test("adds a whole tone family in one go", async ({ seededPage: page }) => {
    const editor = await openSemantics(page);
    await editor.getByRole("button", { name: "Add tone" }).click();

    const dialog = page.getByRole("dialog", { name: "Add tone" });
    await expect(dialog).toBeVisible();
    /* The base weight starts on the track's locked source. */
    await expect(dialog.getByText(/locked source/).first()).toBeVisible();

    await dialog.getByLabel("Tone name").fill("promo");
    await dialog.getByRole("radio", { name: "High contrast" }).click();
    await dialog.getByRole("button", { name: "Add tone" }).click();
    await expect(dialog).toBeHidden();

    const ids = [
      "action.promo",
      "action.promo-hover",
      "action.promo-active",
      "action.promo-surface",
      "action.promo-surface-hover",
      "action.promo-fg",
      "action.promo-border",
      "fg.on-promo",
    ];
    await expect
      .poll(async () => (await storedTokens(page)).map((each) => each.id))
      .toEqual(expect.arrayContaining(ids));

    const tokens = await storedTokens(page);
    const fill = tokens.find((each) => each.id === "action.promo")!;
    const hover = tokens.find((each) => each.id === "action.promo-hover")!;
    /* High contrast: the hover is two 50-steps from the fill. */
    expect(hover.light.weight - fill.light.weight).toBe(100);
  });

  test("refuses a name the layer already has", async ({ seededPage: page }) => {
    const editor = await openSemantics(page);
    await editor.getByRole("button", { name: "Add tone" }).click();
    const dialog = page.getByRole("dialog", { name: "Add tone" });

    await dialog.getByLabel("Tone name").fill("action.primary");
    await expect(dialog.getByRole("alert")).toContainText(
      "Already in the layer",
    );
    await expect(
      dialog.getByRole("button", { name: "Add tone" }),
    ).toBeDisabled();
  });

  test("syncs the seeded tones to a profile, and Undo takes it back", async ({
    seededPage: page,
  }) => {
    const editor = await openSemantics(page);
    const border = async () =>
      (await storedTokens(page)).find(
        (each) => each.id === "status.info-border",
      )?.light.weight;
    const before = await border();

    await editor
      .getByRole("button", { name: "Sync with palette anchors" })
      .click();
    const dialog = page.getByRole("dialog", {
      name: "Sync with palette anchors",
    });
    await expect(dialog).toBeVisible();

    await dialog.getByRole("radio", { name: "High contrast" }).click();
    const sync = dialog.getByRole("button", { name: /^Sync \d+ tokens?$/ });
    await expect(sync).toBeEnabled();
    await sync.click();
    await expect(dialog).toBeHidden();

    await expect.poll(border).toBe(500);

    /* One step of the history. */
    await page.keyboard.press("ControlOrMeta+z");
    await expect.poll(border).toBe(before);
  });
});

test.describe("Tones on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("adds a tone from a bottom sheet", async ({ seededPage: page }) => {
    const editor = await openSemantics(page);
    await editor.getByRole("button", { name: "Add tone" }).click();

    const sheet = page.getByRole("dialog", { name: "Add tone" });
    await expect(sheet.locator(".astryx-bottom-sheet").first()).toBeVisible();
    await sheet.getByLabel("Tone name").fill("accent");
    await sheet.getByRole("button", { name: "Add tone" }).click();
    await expect(sheet).toBeHidden();

    await expect
      .poll(async () => (await storedTokens(page)).map((each) => each.id))
      .toContain("action.accent");
  });
});
