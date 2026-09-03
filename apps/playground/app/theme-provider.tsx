"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Theme } from "@astryxdesign/core/theme";
import { LayerProvider } from "@astryxdesign/core/Layer";
import { neutralTheme } from "@astryxdesign/theme-neutral/built";
import {
  isThemeMode,
  THEME_MODE_STORAGE_KEY,
  type ThemeMode,
} from "./theme-mode";

export { THEME_MODES, type ThemeMode } from "./theme-mode";

interface ThemeModeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

/** Read/set the active colour mode. */
export function useThemeMode(): ThemeModeContextValue {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) {
    throw new Error("useThemeMode must be used within ThemeProvider");
  }
  return ctx;
}

/**
 * The one place the mode lives.
 *
 * What actually flips the studio is Astryx's `Theme`: it puts a class on its
 * wrapper that sets `color-scheme`, which is what every `light-dark()` token
 * beneath it resolves against, and it writes `data-theme` onto `<html>` for
 * the root rules. Nothing else can — setting the attribute by hand leaves
 * the class where it was, and the controls stay in the old mode. Measured,
 * after a screenshot of "light mode" came back dark.
 *
 * Dark by default, because that is the studio the tests and the screenshots
 * know. The choice is read from storage after mount and written back only
 * after that read, for the reason every studio's own read carries: under
 * StrictMode the effects run twice, and a write before the first read lands
 * the default over whatever was saved.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("dark");
  const [hasLoadedMode, setHasLoadedMode] = useState(false);

  useEffect(() => {
    /* Reading localStorage must happen in an effect: a useState initializer
       would run during SSR, where window does not exist, and desync
       hydration. */
    const stored = window.localStorage.getItem(THEME_MODE_STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isThemeMode(stored)) setMode(stored);
    setHasLoadedMode(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedMode) return;
    window.localStorage.setItem(THEME_MODE_STORAGE_KEY, mode);
  }, [hasLoadedMode, mode]);

  return (
    <ThemeModeContext.Provider value={{ mode, setMode }}>
      <Theme theme={neutralTheme} mode={mode}>
        <LayerProvider toast={{ position: "bottomEnd", maxVisible: 2 }}>
          {children}
        </LayerProvider>
      </Theme>
    </ThemeModeContext.Provider>
  );
}
