import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test as base, type Page } from "@playwright/test";

/**
 * The workspace these pages are built from, read as the file it is.
 *
 * Raw JSON rather than through `@blueprint/ui`. The package entry is a `.tsx`
 * that pulls in React and Astryx, which Playwright's Node-side loader cannot
 * resolve — and reading the file directly is the stronger test anyway: an
 * assertion computed with the same functions the page renders with would agree
 * with the page for the wrong reason. This says "the file says 4, the screen
 * says 16, and 16 is four fours".
 *
 * See docs/roadmap/foundations-handover.md.
 */

/* `fileURLToPath`, not `__dirname`: this app is ESM, so the CommonJS globals
   are not defined and the whole spec file fails to load rather than one test
   failing. */
const APP = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export interface ReferenceWorkspace {
  name: string;
  palette: {
    tracks: Array<{ id: string; name: string; seedHex: string }>;
  };
  semantics: Array<{
    id: string;
    name: string;
    light: { trackId: string; weight: number };
    dark: { trackId: string; weight: number };
  }>;
  spacing: { baseUnitPx: number; steps: number[] };
  radius: {
    multiplier: number;
    tokens: Array<{ id: string; basePx: number; scales: boolean }>;
  };
  elevation: {
    colour: { trackId: string; weight: number };
    levels: Array<{
      id: string;
      layers: Array<{ opacity: { light: number; dark: number } }>;
    }>;
  };
  typography: {
    system: {
      baseFontSizePx: number;
      ratio: number;
      stepCount: number;
      fonts: Array<{ id: string; families: string[] }>;
      roles: Array<{ id: string; fontId: string; fontWeight: number }>;
    };
  };
}

export function referenceWorkspace(): ReferenceWorkspace {
  const raw = readFileSync(
    join(APP, "blueprint", "reference.workspace.json"),
    "utf8",
  );
  return JSON.parse(raw).project as ReferenceWorkspace;
}

/** Every route the site has, which is what "every page" means below. */
export const FOUNDATION_ROUTES = [
  "/foundations/colour",
  "/foundations/semantic",
  "/foundations/typography",
  "/foundations/spacing",
  "/foundations/radius",
  "/foundations/elevation",
] as const;

/** The key both applications keep the reader's mode under. */
export const COLOUR_MODE_KEY = "blueprint.colour-mode.v1";

/**
 * Open a page with a mode already chosen.
 *
 * Through an init script rather than by clicking, because the attribute is
 * applied by a `beforeInteractive` script that reads storage before React
 * exists — setting it after navigation would test a different code path from
 * the one a returning reader takes.
 *
 * `system` is written rather than the key being cleared, which is a fact worth
 * knowing: with nothing stored the shared hook falls back to dark and persists
 * it, so an empty key is not the system state — it is a reader who has not
 * chosen yet, and they get dark whatever their machine prefers.
 */
export async function openInMode(
  page: Page,
  route: string,
  mode: "light" | "dark" | "system",
): Promise<void> {
  await page.addInitScript(
    ([key, value, guard]) => {
      /* Once. An init script runs on every navigation, so without the guard a
         reload re-seeds the mode and a test about persistence measures the
         fixture instead of the app. */
      if (window.sessionStorage.getItem(guard)) return;
      window.sessionStorage.setItem(guard, "1");
      window.localStorage.setItem(key, value);
    },
    [COLOUR_MODE_KEY, mode, "blueprint.e2e-seeded.mode"] as const,
  );
  await page.goto(route);
}

export const test = base;
export { expect };
