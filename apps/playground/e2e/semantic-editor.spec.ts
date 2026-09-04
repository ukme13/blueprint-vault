import { expect, test, WORKSPACE_STORAGE_KEY } from "./fixtures";
import type { Locator, Page } from "@playwright/test";

/**
 * The semantic layer, edited.
 *
 * See docs/roadmap/semantic-tokens.md. The test that matters most is the alias
 * one: a token stores a reference, so editing the primitive has to move it. A
 * layer that copied values would pass every other case here.
 */

async function openSemantics(page: Page): Promise<Locator> {
  await page.getByRole("button", { name: "Semantics" }).click();
  const editor = page.getByRole("region", { name: "Semantic tokens" });
  await expect(editor).toBeVisible();
  return editor;
}

function row(editor: Locator, name: string): Locator {
  return editor.locator("tr:has([data-token])").filter({ hasText: name });
}

/**
 * The rendered colour of a token's swatch in one mode.
 *
 * Through `data-mode` rather than by nesting: the light column's wrapper also
 * contains the dark one, so filtering ancestors read the light swatch for both
 * modes and made a passing test out of a broken one.
 */
async function swatch(
  editor: Locator,
  tokenName: string,
  mode: "light" | "dark",
): Promise<string> {
  return row(editor, tokenName)
    .locator(`[data-mode="${mode}"] i`)
    .first()
    .evaluate((node) => getComputedStyle(node).backgroundColor);
}

test.describe("The semantic editor", () => {
  test("seeds the twenty-five roles the page needs", async ({
    seededPage: page,
  }) => {
    const editor = await openSemantics(page);
    await expect(editor.locator("tr:has([data-token])")).toHaveCount(25);
    await expect(editor.getByText("--color-action-primary")).toBeVisible();
  });

  test("shows both modes at once", async ({ seededPage: page }) => {
    /* A token exists to hold two values, and the pair is what is being
       decided. Choosing them one at a time is how a layer ends up with dark
       text on a dark page. */
    const editor = await openSemantics(page);
    await expect(editor.getByLabel("Action primary light track")).toBeVisible();
    await expect(editor.getByLabel("Action primary dark track")).toBeVisible();
  });

  test("moves every token pointing at a track when that track changes", async ({
    seededPage: page,
  }) => {
    /* The rule the whole layer rests on, and the one thing no unit test can
       show: no reload, no re-seed, just the reference resolving again. */
    const editor = await openSemantics(page);
    const before = await swatch(editor, "Action primary", "light");

    await page.getByRole("button", { name: "Overview" }).click();
    await page
      .getByRole("button", { name: "Choose primary source colour" })
      .click();
    const picker = page.getByRole("dialog", {
      name: "primary source colour picker",
    });
    const hex = picker.getByLabel("primary source colour HEX");
    await hex.fill("#0B7A3D");
    await hex.press("Enter");
    /* Escape rather than the close button: Enter may already have dismissed
       the picker, and clicking a button that is gone waits for the timeout. */
    await page.keyboard.press("Escape");
    await expect(picker).toBeHidden();

    await page.getByRole("button", { name: "Semantics" }).click();
    await expect
      .poll(() => swatch(editor, "Action primary", "light"))
      .not.toBe(before);

    /* And the stored token still holds only a reference. Switching tabs
       remounts this editor, so the swatch changing above would also be true of
       a layer that re-copied a value on mount — this is the part that says it
       is an alias. The model's own test covers resolution; this covers what
       reaches storage. */
    await expect
      .poll(() =>
        page.evaluate((key) => {
          const raw = window.localStorage.getItem(key);
          if (!raw) return null;
          const stored = JSON.parse(raw) as {
            semantics?: Array<{ id: string; light: Record<string, unknown> }>;
          };
          const token = stored.semantics?.find(
            (each) => each.id === "action.primary",
          );
          return token ? Object.keys(token.light).sort() : null;
        }, WORKSPACE_STORAGE_KEY),
      )
      .toEqual(["trackId", "weight"]);
  });

  test("repoints one mode and leaves the other", async ({
    seededPage: page,
  }) => {
    const editor = await openSemantics(page);
    const darkBefore = await swatch(editor, "Action primary", "dark");

    await editor.getByLabel("Action primary light weight").click();
    await page.getByRole("option", { name: "100", exact: true }).click();

    await expect
      .poll(() => swatch(editor, "Action primary", "dark"))
      .toBe(darkBefore);
  });

  test("renames the token and the variable it exports", async ({
    seededPage: page,
  }) => {
    /* The id is the exported name, so a rename that left it alone would let
       the label and the variable a developer writes drift apart. */
    const editor = await openSemantics(page);
    const field = editor.getByLabel("surface.raised name");

    await field.fill("Brand wash");
    await field.press("Enter");

    await expect(editor.getByText("--color-brand-wash")).toBeVisible();
    await expect(editor.getByText("--color-surface-raised")).toHaveCount(0);
  });

  test("adds and removes a token", async ({ seededPage: page }) => {
    const editor = await openSemantics(page);

    await editor.getByRole("button", { name: "Add token" }).click();
    await expect(editor.locator("tr:has([data-token])")).toHaveCount(26);

    await editor.getByRole("button", { name: "Remove New token" }).click();
    await expect(editor.locator("tr:has([data-token])")).toHaveCount(25);
  });

  test("keeps the layer across a reload", async ({ seededPage: page }) => {
    const editor = await openSemantics(page);
    await editor.getByLabel("Action primary light weight").click();
    await page.getByRole("option", { name: "100", exact: true }).click();

    await expect
      .poll(() =>
        page.evaluate((key) => {
          const raw = window.localStorage.getItem(key);
          if (!raw) return null;
          const stored = JSON.parse(raw) as {
            semantics?: Array<{ id: string; light: { weight: number } }>;
          };
          return (
            stored.semantics?.find((token) => token.id === "action.primary")
              ?.light.weight ?? null
          );
        }, WORKSPACE_STORAGE_KEY),
      )
      .toBe(100);

    await page.reload();
    const reopened = await openSemantics(page);
    await expect(
      reopened.getByLabel("Action primary light weight"),
    ).toContainText("100");
  });
});
