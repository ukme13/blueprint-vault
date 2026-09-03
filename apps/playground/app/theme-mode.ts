/**
 * The studio's colour mode: the type, its values, and where it is kept.
 *
 * A module of its own, with no "use client", because two very different
 * files read it. The provider is a client component; the root layout is a
 * server component that inlines the storage key into a script. A constant
 * imported from a client module into a server component arrives as a client
 * reference rather than a string, so the key has to live somewhere neither
 * side owns.
 */

/**
 * Light, dark, or whatever the operating system says.
 *
 * `system` is a real third state rather than the absence of a choice: it is
 * what somebody who never touched the control gets, and Astryx's `Theme`
 * takes it as a mode of its own — removing `data-theme` so `color-scheme`
 * falls back to `light dark` and the browser decides.
 */
export type ThemeMode = "light" | "dark" | "system";

export const THEME_MODES: readonly ThemeMode[] = ["light", "dark", "system"];

/** Read by the provider after mount, and by the pre-paint script before it. */
export const THEME_MODE_STORAGE_KEY = "blueprint.colour-mode.v1";

export function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === "string" && (THEME_MODES as string[]).includes(value);
}
