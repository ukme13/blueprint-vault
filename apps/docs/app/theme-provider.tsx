"use client";

import { createContext, useContext, type ReactNode } from "react";
import { Theme } from "@astryxdesign/core/theme";
import { neutralTheme } from "@astryxdesign/theme-neutral/built";
import {
  useColourModePreference,
  type ColourModePreference,
} from "@blueprint/ui";

const ThemeModeContext = createContext<ColourModePreference | null>(null);

/** Read/set the active colour mode. */
export function useThemeMode(): ColourModePreference {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) {
    throw new Error("useThemeMode must be used within ThemeProvider");
  }
  return ctx;
}

/**
 * The mode this application is in.
 *
 * It was pinned: `mode="light"` here and `data-theme="light"` on the root
 * element, which is a documentation site for a system whose whole point is
 * that every name carries two values. A reader could not see the half the
 * page was describing.
 *
 * The state, the storage key and the media query are
 * `useColourModePreference` in @blueprint/ui, shared with the studio, so a
 * person moving between the two keeps one preference. What is left here is
 * this application's: which Astryx theme, and no toast layer, because nothing
 * in the documentation raises one.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const preference = useColourModePreference();

  return (
    <ThemeModeContext.Provider value={preference}>
      <Theme theme={neutralTheme} mode={preference.mode}>
        {children}
      </Theme>
    </ThemeModeContext.Provider>
  );
}
