import { describe, expect, it } from "vitest";
import {
  isThemeMode,
  resolveThemeMode,
  THEME_MODES,
  type ThemeMode,
} from "./theme-mode";

describe("the theme mode somebody chose", () => {
  it("offers the two colour modes and the deferral", () => {
    expect(THEME_MODES).toEqual(["light", "dark", "system"]);
  });

  it("rejects a stored value that is no longer a mode", () => {
    /* The studio reads this out of localStorage, where anything can be. */
    expect(isThemeMode("dark")).toBe(true);
    expect(isThemeMode("System")).toBe(false);
    expect(isThemeMode(null)).toBe(false);
  });
});

describe("resolving a theme mode to something a token can answer", () => {
  it("passes an explicit choice through, whatever the machine prefers", () => {
    /* The point of choosing light on a dark machine. */
    expect(resolveThemeMode("light", true)).toBe("light");
    expect(resolveThemeMode("dark", false)).toBe("dark");
  });

  it("hands system to the machine", () => {
    expect(resolveThemeMode("system", true)).toBe("dark");
    expect(resolveThemeMode("system", false)).toBe("light");
  });

  it("never answers with the choice itself", () => {
    /* The reason the two types are separate: a caller resolves so it can look
       a reference up per mode, and "system" is not a key either half is
       stored under. */
    for (const mode of THEME_MODES) {
      for (const prefersDark of [true, false]) {
        expect(resolveThemeMode(mode as ThemeMode, prefersDark)).not.toBe(
          "system",
        );
      }
    }
  });
});
