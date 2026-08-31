import { readFileSync } from "node:fs";
import { expect, test } from "./fixtures";
import type { Page } from "@playwright/test";

/**
 * What a client is actually handed.
 *
 * See docs/roadmap/semantic-tokens.md. The alias rule is checked at the unit
 * level; this is about the file reaching the download with both layers in it,
 * which is where a client's install either works or does not.
 */

async function download(page: Page, format: string) {
  const preview = page.getByRole("region", { name: "Export preview" });
  if (!(await preview.isVisible())) {
    await page.getByRole("button", { name: "Export palette" }).click();
  }
  await page.getByRole("button", { name: format, exact: true }).click();
  await expect(preview).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download" }).click();
  const file = await downloadPromise;
  return readFileSync(await file.path(), "utf8");
}

test.describe("The colour export", () => {
  test("carries the primitives and the semantics in one CSS file", async ({
    seededPage: page,
  }) => {
    /* Two files that must be remembered together is how a client ends up with
       aliases pointing at variables nothing declares — which a browser drops
       in silence. */
    const css = await download(page, "CSS");

    expect(css).toMatch(/--color-primary-550:\s*#/);
    expect(css).toContain("--color-action-primary: var(--color-primary-");
    expect(css).toContain('[data-theme="dark"]');
  });

  test("emits Design Tokens with the alias resolvable in the same file", async ({
    seededPage: page,
  }) => {
    const tokens = JSON.parse(await download(page, "Design Tokens")) as {
      palette: Record<string, Record<string, unknown>>;
      semantic: {
        light: Record<string, Record<string, { $value: string }>>;
      };
    };

    const alias = tokens.semantic.light.action!.primary!.$value;
    const [, track, weight] = /^\{palette\.([a-z-]+)\.(\d+)\}$/.exec(alias)!;
    expect(tokens.palette[track!]![weight!]).toBeDefined();
  });

  test("reports the semantic pairs in both modes", async ({
    seededPage: page,
  }) => {
    const markdown = await download(page, "Report (Markdown)");

    expect(markdown).toContain("## Semantic tokens");
    expect(markdown).toContain("text.primary");
    expect(markdown).toContain("surface.base");
    /* The resolved primitives, because a token id alone does not say which
       shade to go and change. */
    expect(markdown).toMatch(/neutral \d+ on neutral \d+/);
    expect(markdown).toMatch(/\|\s*light\s*\|/);
    expect(markdown).toMatch(/\|\s*dark\s*\|/);
  });
});
