import { expect, test as base, type Page } from "@playwright/test";

export const TYPOGRAPHY_STORAGE_KEY = "blueprint.typography-project.v1";

const SEED_GUARD_KEY = "blueprint.e2e-seeded.typography";

export function defaultTypographyProject() {
  return {
    name: "My type scale",
    fontFamily: "Geist Sans, ui-sans-serif, system-ui",
    baseFontSizePx: 16,
    ratio: 1.25,
    stepCount: 9,
    roleStyles: {
      display: { fontWeight: 700, lineHeight: 1.1, letterSpacingPx: -0.5 },
      heading: { fontWeight: 700, lineHeight: 1.2, letterSpacingPx: -0.25 },
      title: { fontWeight: 600, lineHeight: 1.3, letterSpacingPx: 0 },
      body: { fontWeight: 400, lineHeight: 1.5, letterSpacingPx: 0 },
      label: { fontWeight: 500, lineHeight: 1.4, letterSpacingPx: 0.1 },
      caption: { fontWeight: 400, lineHeight: 1.4, letterSpacingPx: 0.2 },
    },
  };
}

export async function seedTypographyProject(
  page: Page,
  project = defaultTypographyProject(),
): Promise<void> {
  // See the comment on seedProject in ./fixtures.ts. Waiting for the onboarding
  // heading only narrows the race, because that heading is server-rendered and
  // appears before hydration runs the effect that clears storage. Seeding from
  // an init script closes it.
  await page.addInitScript(
    ({ key, value, guard }) => {
      if (window.sessionStorage.getItem(guard)) return;
      window.sessionStorage.setItem(guard, "1");
      window.localStorage.setItem(key, JSON.stringify(value));
    },
    { key: TYPOGRAPHY_STORAGE_KEY, value: project, guard: SEED_GUARD_KEY },
  );
  await page.goto("/typography");
}

/**
 * Show one of the inspector's panels.
 *
 * The inspector is three tabs now — the scale and its fonts, the groups, and
 * the warnings — so a test reaching for a role row has to say which panel it
 * expects to find one in, the way a person does.
 *
 * Matched on the start of the name: the warnings tab carries a count.
 */
export async function showInspectorPanel(
  page: Page,
  name: "Settings" | "Groups" | "Warnings",
): Promise<void> {
  await page.getByRole("tab", { name: new RegExp(`^${name}`) }).click();
}

export const test = base.extend<{ seededPage: Page }>({
  seededPage: async ({ page }, runTest) => {
    await seedTypographyProject(page);
    /* The studio shows a loading placeholder until the effect that reads
       localStorage has run, so the settings are not in the DOM when goto()
       resolves. Locator assertions retry and would not notice, but count()
       does not, and a test that measures a baseline before acting reads a
       zero that is never true of a seeded project. */
    await expect(
      page.getByRole("region", { name: "Type scale settings" }),
    ).toBeVisible();
    await runTest(page);
  },
});

export { expect };
