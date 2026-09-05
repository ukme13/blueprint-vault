import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

/*
 * Every role the studio exports has to exist in the studio's own stylesheet.
 *
 * Tailwind v4 tree-shakes an `@theme` variable that no source file mentions,
 * and "mentions" means its scanner found the complete name as text. The Button
 * reaches its tone through `var()` strings assembled from a table at runtime,
 * so nothing it does is text a scanner can find. Eleven roles were dropped
 * from the compiled stylesheet with no error anywhere — `--color-action-
 * primary-hover` resolved to the empty string, the declaration reading it was
 * invalid at computed-value time, and the "Add font" button went transparent
 * on hover instead of darkening.
 *
 * `@theme static` is the fix, and this holds it. The same fault hit the export
 * on 2026-09-05 and was fixed the same way there; the studio's own theme.css
 * kept it for as long as nobody read a role no utility class also named.
 *
 * The list of roles comes out of the export rather than being written here.
 * The export is generated from the seeded semantic layer — the same
 * `seedSemanticTokens` output the studio renders — so it grows when the seed
 * set does, which is the only moment this test has a job to do. A hand-kept
 * copy would agree with the seed set right up until then.
 *
 * The e2e loader cannot import `seedSemanticTokens` directly: the package
 * entry is a `.tsx` that pulls in React and Astryx, and its `export *` barrels
 * come back empty through Playwright's transform. Going through the export is
 * not a workaround for that so much as the better question — what a client is
 * handed is what the studio has to be able to draw.
 */

/** The semantic roles in an export: the aliases, as against the hex shades. */
function rolesIn(css: string): string[] {
  const roles = [...css.matchAll(/^\s*(--color-[a-z0-9-]+)\s*:\s*var\(/gm)].map(
    (match) => match[1]!,
  );
  return [...new Set(roles)].sort();
}

async function exportedCss(page: Page): Promise<string> {
  await page.getByRole("button", { name: "Export palette" }).click();
  await page.getByRole("button", { name: "CSS", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Export preview" }),
  ).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download" }).click();
  const file = await downloadPromise;
  return readFileSync(await file.path(), "utf8");
}

const unresolved = (page: Page, names: string[], theme: "light" | "dark") =>
  page.evaluate(
    ({ names: wanted, theme: mode }) => {
      document.documentElement.setAttribute("data-theme", mode);
      const cs = getComputedStyle(document.documentElement);
      return wanted.filter((name) => cs.getPropertyValue(name).trim() === "");
    },
    { names, theme },
  );

test.describe("The compiled stylesheet", () => {
  test("carries every role the export names, in both modes", async ({
    seededPage: page,
  }) => {
    const roles = rolesIn(await exportedCss(page));

    /* An empty list would be a test that passes by measuring nothing. Seven
       tones of seven roles plus the chrome puts the real number past sixty. */
    expect(roles.length).toBeGreaterThan(60);

    const light = await unresolved(page, roles, "light");
    expect(
      light,
      `dropped from the compiled CSS:\n${light.join("\n")}`,
    ).toEqual([]);

    /* Every role is one `light-dark()` value, so a name present in one mode is
       present in both — until something splits them, which is the case worth
       catching. */
    const dark = await unresolved(page, roles, "dark");
    expect(dark, `dropped from the compiled CSS:\n${dark.join("\n")}`).toEqual(
      [],
    );
  });
});
