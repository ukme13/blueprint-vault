import { expect, referenceWorkspace, test } from "./fixtures";

/*
 * One value followed from the workspace file to the rendered page, per page.
 *
 * The claim every foundation page makes is that it is a template over a
 * workspace. A page that stopped reading the data would keep rendering — the
 * same table, the same headings, the last values somebody saw — and nothing
 * else in this repository would notice, because the unit tests render the
 * components rather than the site.
 *
 * The expectations are read out of the JSON and worked out here rather than
 * asked of `@blueprint/ui`. An assertion computed with the same functions the
 * page renders with would agree with the page for the wrong reason. This says
 * "the file says the base unit is 4, the screen says 16px, and 16 is four
 * fours".
 */

const workspace = referenceWorkspace();

test("colour: a track's source colour reaches the table", async ({ page }) => {
  const primary =
    workspace.palette.tracks.find((track) => track.id === "primary") ??
    workspace.palette.tracks[0]!;

  await page.goto("/foundations/colour");

  /* A track's seed is its own 500, so the file's `seedHex` is a value the page
     has to print. Upper-cased because the page formats hex that way. */
  await expect(page.locator("body")).toContainText(
    primary.seedHex.toUpperCase(),
  );
  await expect(page.locator("body")).toContainText(
    `--color-${primary.name}-500`,
  );
});

test("semantic: a role points where the file says", async ({ page }) => {
  /* A role the file itself stores, rather than one `fillSeedRoles` adds on
     read — so the assertion is about this document and not about the seed. */
  const role = workspace.semantics.find(
    (token) => token.id === "surface.base",
  )!;

  await page.goto("/foundations/semantic");

  const row = page.locator("tr", {
    has: page.getByText("--color-surface-base", { exact: true }),
  });
  await expect(row).toContainText(`${role.light.trackId} ${role.light.weight}`);
  await expect(row).toContainText(`${role.dark.trackId} ${role.dark.weight}`);
});

test("semantic: a transparent role says how transparent", async ({ page }) => {
  /* The whole path, on one role: the file carries an alpha, the reader keeps
     it, the resolver hands it on and the cell says it. Until the workspace
     moved to version 8 there was no such role in this repository, so every
     part of that could have been wrong and every test still passed.

     Read out of the JSON and turned into a percentage here rather than asked
     of `alphaPercent`, for the reason at the top of this file: an expectation
     computed by the function under test agrees with it for the wrong reason. */
  const role = workspace.semantics.find(
    (token) => token.id === "border.subtle",
  )!;
  expect(
    role.light.alpha,
    "border.subtle carries no alpha; this test has nothing to check",
  ).toBeLessThan(1);

  await page.goto("/foundations/semantic");

  const row = page.locator("tr", {
    has: page.getByText("--color-border-subtle", { exact: true }),
  });
  await expect(row).toContainText(
    `${role.light.trackId} ${role.light.weight} at ${role.light.alpha! * 100}%`,
  );
  await expect(row).toContainText(
    `${role.dark.trackId} ${role.dark.weight} at ${role.dark.alpha! * 100}%`,
  );

  /* And it is drawn as transparent, not merely described as it. */
  await expect(row.locator("[data-transparent]").first()).toBeVisible();
});

test("typography: the scale's base and ratio reach the table", async ({
  page,
}) => {
  const { baseFontSizePx, ratio, stepCount } = workspace.typography.system;

  await page.goto("/foundations/typography");

  const scale = page.locator("table").first();
  await expect(scale).toContainText(`${baseFontSizePx}px`);
  await expect(scale).toContainText(String(ratio));
  await expect(scale).toContainText(String(stepCount));
});

test("spacing: a step is its multiple of the base unit", async ({ page }) => {
  const { baseUnitPx, density = 1, steps } = workspace.spacing;
  /* The largest, because it is the one no other step's value collides with. */
  const step = Math.max(...steps);
  const px = step * baseUnitPx * (step >= 2 ? density : 1);

  await page.goto("/foundations/spacing");

  const row = page.locator("tr", {
    has: page.getByText(`--spacing-${step}`, { exact: true }),
  });
  await expect(row).toContainText(`${px}px`);
});

test("radius: a token is its base times the multiplier", async ({ page }) => {
  const { multiplier, tokens } = workspace.radius;
  const token = tokens.find((each) => each.id === "container")!;
  const px =
    typeof token.unlinkedPx === "number"
      ? Math.round(token.unlinkedPx)
      : token.scales
        ? Math.round(token.basePx * multiplier)
        : token.basePx;

  await page.goto("/foundations/radius");

  const row = page.locator("tr", {
    has: page.getByText("--radius-container", { exact: true }),
  });
  await expect(row).toContainText(`${px}px`);
});

test("elevation: a level's two strengths reach the table", async ({ page }) => {
  const level = workspace.elevation.levels[0]!;
  const { light, dark } = level.layers[0]!.opacity;

  await page.goto("/foundations/elevation");

  const row = page.locator("tr", {
    has: page.getByText(`--shadow-${level.id}`, { exact: true }),
  });
  await expect(row).toContainText(String(light));
  await expect(row).toContainText(String(dark));
  /* And the shade the shadow is drawn from is named, because the exported
     value is a literal `rgba` and this is a reader's only route back. */
  await expect(page.locator("body")).toContainText(
    `${workspace.elevation.colour.trackId} ${workspace.elevation.colour.weight}`,
  );
});
