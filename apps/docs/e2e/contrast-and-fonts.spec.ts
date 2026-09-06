import { expect, referenceWorkspace, test } from "./fixtures";

/*
 * The two claims that need a browser rather than a render.
 *
 * A contrast verdict with only a ratio in it cannot be acted on — a reader has
 * to know which two roles were measured and which two shades they landed on.
 * And a specimen drawn in the wrong typeface looks entirely correct: right
 * size, right weight, right rhythm, wrong face. Only a computed style says
 * which font actually drew it.
 */

const workspace = referenceWorkspace();

test("the contrast rows name both roles and both primitives", async ({
  page,
}) => {
  await page.goto("/foundations/semantic");

  const rows = page.locator("table tr", { hasText: /:1/ });
  const count = await rows.count();
  expect(count, "no contrast rows on the page").toBeGreaterThan(0);

  /* Every one of them, not the first. A row that lost its reference is the
     one nobody looks at. */
  for (let at = 0; at < count; at += 1) {
    const text = (await rows.nth(at).innerText()).replace(/\s+/g, " ");

    const roles = text.match(/[a-z]+\.[a-z-]+/g) ?? [];
    const literals = text.match(/#[0-9a-fA-F]{6}\b/g) ?? [];
    const primitives = text.match(/[a-z]+ \d{2,3}\b/g) ?? [];

    /* Both sides of the measurement are named. Usually that is two roles; one
       row asks what plain white would do on the primary fill, so a side can
       legitimately be a literal instead — which is why this counts sides
       rather than roles. */
    expect(
      roles.length + literals.length,
      `only ${roles.length + literals.length} side(s) named in: ${text}`,
    ).toBeGreaterThanOrEqual(2);

    /* And every role says which shade it landed on, which is the half a ratio
       alone cannot be acted on without. */
    expect(
      primitives.length,
      `${roles.length} role(s) but ${primitives.length} primitive(s) in: ${text}`,
    ).toBeGreaterThanOrEqual(roles.length);
  }
});

test("the specimens are in the workspace's font, not the studio's", async ({
  page,
}) => {
  /* The mistake this exists for: the documentation is set in Inter, the
     workspace names something else, and a specimen inheriting the page's font
     renders at the right size in the wrong face. Nothing about the page looks
     broken. */
  const primary = workspace.typography.system.fonts[0]!.families[0]!;

  await page.goto("/foundations/typography");

  const specimen = page.locator("[style*='font-family']").first();
  await expect(specimen).toBeVisible();

  const family = await specimen.evaluate(
    (element) => getComputedStyle(element).fontFamily,
  );
  expect(family).toContain(primary);
  expect(family).not.toContain("Inter");

  /* The chrome around it is the studio's font, which is the other half of the
     claim: two typefaces on one page, each where it belongs. */
  const heading = await page
    .getByRole("heading", { level: 1 })
    .first()
    .evaluate((element) => getComputedStyle(element).fontFamily);
  expect(heading).toContain("Inter");
  expect(heading).not.toContain(primary);
});

test("the Google families the workspace names are loaded", async ({ page }) => {
  await page.goto("/foundations/typography");
  await page.waitForLoadState("networkidle");

  const families = workspace.typography.system.fonts.flatMap(
    (font) => font.families,
  );
  const loaded = await page.evaluate(() => {
    const names: string[] = [];
    document.fonts.forEach((face) => {
      if (face.status === "loaded") names.push(face.family);
    });
    return names;
  });

  /* At least the primary of each entry. A stack's fallback may legitimately go
     unfetched if no glyph on the page needs it. */
  for (const font of workspace.typography.system.fonts) {
    expect(loaded, `${font.families[0]} was named and never loaded`).toContain(
      font.families[0],
    );
  }
  expect(families.length).toBeGreaterThan(0);
});
