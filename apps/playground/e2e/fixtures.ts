import { test as base, type Page } from "@playwright/test";

export const PROJECT_STORAGE_KEY = "blueprint.palette-project.v1";

const SEED_GUARD_KEY = "blueprint.e2e-seeded.palette";

export const BLUEPRINT_20_WEIGHTS = [
  25, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750,
  800, 850, 900, 950,
];

export const BLUEPRINT_20_LIGHTNESS = [
  97.5, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 25, 20, 15, 10,
  5,
];

export function defaultProject() {
  return {
    name: "My colour system",
    tracks: [
      { id: "primary", name: "primary", seedHex: "#7646ab" },
      { id: "neutral", name: "neutral", seedHex: "#737373" },
      { id: "success", name: "success", seedHex: "#2f7d32" },
      { id: "warning", name: "warning", seedHex: "#b87503" },
      { id: "error", name: "error", seedHex: "#b02b1b" },
      { id: "info", name: "info", seedHex: "#2878b8" },
    ],
    lightnessPattern: "custom",
    lightnessValues: BLUEPRINT_20_LIGHTNESS,
  };
}

export async function seedProject(
  page: Page,
  project = defaultProject(),
): Promise<void> {
  // Seed from an init script so the project is in storage before any app code
  // runs.
  //
  // Seeding after navigation instead races the studio's own startup: on mount
  // it reads storage, finds no project, and its persist effect then calls
  // removeItem. page.goto resolves on load, before those effects run, so a
  // seed written at that point is deleted by the app and the test reloads into
  // the onboarding screen.
  //
  // The sessionStorage guard keeps this to the first navigation only, so later
  // reloads in a test still see whatever the app itself wrote rather than
  // having the seed silently reapplied.
  await page.addInitScript(
    ({ key, value, guard }) => {
      if (window.sessionStorage.getItem(guard)) return;
      window.sessionStorage.setItem(guard, "1");
      window.localStorage.setItem(key, JSON.stringify(value));
    },
    { key: PROJECT_STORAGE_KEY, value: project, guard: SEED_GUARD_KEY },
  );
  await page.goto("/");
}

export const test = base.extend<{ seededPage: Page }>({
  seededPage: async ({ page }, runTest) => {
    await seedProject(page);
    await runTest(page);
  },
});

export { expect } from "@playwright/test";
