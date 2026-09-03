import { COLOUR_MODES, type ColourMode } from "./semantic";

/**
 * What somebody chose, as against what actually gets drawn.
 *
 * `ColourMode` is the pair every semantic token holds: a light reference and a
 * dark one, and something upstream has to say which of the two is read.
 * `ThemeMode` is that choice, and it has a third state which is not a mode at
 * all — `system` defers to the operating system, so it has no value for a
 * token lookup to resolve against.
 *
 * Two types rather than one, because the difference is load-bearing: it is
 * what stops `"system"` reaching `resolveSemantic`, which has no answer for
 * it and would fall through to whichever half was written first.
 * `resolveThemeMode` is the only crossing.
 */
export type ThemeMode = ColourMode | "system";

export const THEME_MODES: readonly ThemeMode[] = [...COLOUR_MODES, "system"];

/** Whether a stored string is still one of the modes on offer. */
export function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === "string" && (THEME_MODES as string[]).includes(value);
}

/**
 * The mode to draw in, given the choice and what the machine prefers.
 *
 * `prefersDark` is a parameter rather than a media query read in here. The
 * query is a subscription — it changes while the page is open, when somebody
 * flips their OS at sunset — and whoever owns that subscription already has
 * the answer. Taking it as an argument also leaves this callable from a
 * server render and from a test, neither of which has `matchMedia`.
 */
export function resolveThemeMode(
  mode: ThemeMode,
  prefersDark: boolean,
): ColourMode {
  if (mode !== "system") return mode;
  return prefersDark ? "dark" : "light";
}
