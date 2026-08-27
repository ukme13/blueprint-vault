import { test as base, type Page } from "@playwright/test";

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

export const test = base.extend<{ seededPage: Page }>({
  seededPage: async ({ page }, runTest) => {
    await seedTypographyProject(page);
    await runTest(page);
  },
});

export { expect } from "@playwright/test";
