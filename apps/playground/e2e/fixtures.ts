import { expect, test as base, type Page } from "@playwright/test";

export const PROJECT_STORAGE_KEY = "blueprint.palette-project.v1";

/* Declared rather than imported from @blueprint/ui: the package entry is a
   .tsx the Playwright loader will not resolve. Kept in step by hand. */
export const WORKSPACE_STORAGE_KEY = "blueprint.workspace.v1";
export const LIBRARY_STORAGE_KEY = "blueprint.library.v1";
export const PALETTE_VIEW_STORAGE_KEY = "blueprint.palette-view.v1";

/**
 * The current document after the library split.
 *
 * A shade edit writes `blueprint.workspace.{id}`, not the retired v1 key.
 * Init scripts may still seed v1; first load migrates. This function is the
 * evaluate body, so its keys stay inlined.
 */
export function readCurrentWorkspaceRaw(): string | null {
  const libraryRaw = window.localStorage.getItem("blueprint.library.v1");
  if (libraryRaw) {
    try {
      const library = JSON.parse(libraryRaw) as { currentId?: unknown };
      if (typeof library.currentId === "string") {
        return window.localStorage.getItem(
          `blueprint.workspace.${library.currentId}`,
        );
      }
    } catch {
      /* Fall through to the retired v1 key. */
    }
  }
  return window.localStorage.getItem("blueprint.workspace.v1");
}

export function writeCurrentWorkspaceRaw(raw: string): void {
  const libraryRaw = window.localStorage.getItem("blueprint.library.v1");
  if (libraryRaw) {
    try {
      const library = JSON.parse(libraryRaw) as { currentId?: unknown };
      if (typeof library.currentId === "string") {
        window.localStorage.setItem(
          `blueprint.workspace.${library.currentId}`,
          raw,
        );
        return;
      }
    } catch {
      /* Fall through. */
    }
  }
  window.localStorage.setItem("blueprint.workspace.v1", raw);
}

export function clearStoredLibrary(): void {
  const libraryRaw = window.localStorage.getItem("blueprint.library.v1");
  if (libraryRaw) {
    try {
      const library = JSON.parse(libraryRaw) as { ids?: unknown };
      if (Array.isArray(library.ids)) {
        for (const id of library.ids) {
          if (typeof id === "string") {
            window.localStorage.removeItem(`blueprint.workspace.${id}`);
          }
        }
      }
    } catch {
      /* Still drop the index. */
    }
    window.localStorage.removeItem("blueprint.library.v1");
  }
  window.localStorage.removeItem("blueprint.workspace.v1");
}

export async function readStoredWorkspace(page: Page) {
  const raw = await page.evaluate(readCurrentWorkspaceRaw);
  return raw ? JSON.parse(raw) : null;
}

export async function writeStoredWorkspace(page: Page, workspace: unknown) {
  await page.evaluate(writeCurrentWorkspaceRaw, JSON.stringify(workspace));
}

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
      { id: "secondary", name: "secondary", seedHex: "#0f9d8f" },
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
  await page.goto("/colour");
  await expect(
    page.getByRole("region", { name: "Palette toolbar" }),
  ).toBeVisible();
}

/** Theme is a button group on the expanded rail, a menu when collapsed. */
export async function openTheme(page: Page) {
  const radios = page.getByRole("radiogroup", { name: "Theme" });
  if (await radios.isVisible()) {
    return radios;
  }
  const light = page.getByRole("menuitem", { name: "Light" });
  if (!(await light.isVisible())) {
    const theme = page.getByRole("button", { name: "Theme" });
    await expect(theme).toBeVisible();
    await theme.click();
  }
  await expect(light).toBeVisible();
  return page.getByRole("menu");
}

/** Home create lives in a dialog, not on the page. */
export async function createWorkspaceFromHome(page: Page, name?: string) {
  await page.getByRole("button", { name: "New project" }).click();
  const dialog = page.getByRole("dialog", { name: "New project" });
  await expect(dialog).toBeVisible();
  if (name !== undefined) {
    await dialog.getByLabel("Project name").fill(name);
  }
  await dialog.getByRole("button", { name: "Create workspace" }).click();
  await expect(page).toHaveURL(/\/colour\/?$/);
}

/** Preview frames. Studio rail only — Home has no Settings. */
export async function openWorkspaceSettings(page: Page) {
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Workspace settings" });
  await expect(dialog).toBeVisible();
  return dialog;
}

export const test = base.extend<{ seededPage: Page }>({
  seededPage: async ({ page }, runTest) => {
    await seedProject(page);
    /* goto resolves before the effects that read storage and persist have
       run, so a test that inspects storage or counts anything sees the page
       mid-flight. Waiting for the toolbar is waiting for hydration. */
    await expect(
      page.getByRole("region", { name: "Palette toolbar" }),
    ).toBeVisible();
    await runTest(page);
  },
});

export { expect };
