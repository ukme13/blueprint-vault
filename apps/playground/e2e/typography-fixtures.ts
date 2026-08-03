import { test as base, type Page } from "@playwright/test";

export const TYPOGRAPHY_STORAGE_KEY = "blueprint.typography-project.v1";

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
  await page.goto("/typography");
  await page.getByRole("heading", { name: "Create your type scale" }).waitFor();
  await page.evaluate(
    ({ key, value }) => {
      window.localStorage.setItem(key, JSON.stringify(value));
    },
    { key: TYPOGRAPHY_STORAGE_KEY, value: project },
  );
  await page.reload();
}

export const test = base.extend<{ seededPage: Page }>({
  seededPage: async ({ page }, runTest) => {
    await seedTypographyProject(page);
    await runTest(page);
  },
});

export { expect } from "@playwright/test";
