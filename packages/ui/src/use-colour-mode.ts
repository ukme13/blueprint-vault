"use client";

import { useEffect, useState } from "react";
import { COLOUR_MODE_STORAGE_KEY } from "./color/colour-mode";
import {
  isThemeMode,
  resolveThemeMode,
  type ThemeMode,
} from "./color/theme-mode";
import type { ColourMode } from "./color/semantic";

/**
 * The colour mode an application is in, and the choice behind it.
 *
 * The state, the persistence and the media query — everything except what an
 * application does with the answer. Both applications wrap it in their own
 * provider, because what surrounds it is theirs: the playground puts a toast
 * layer inside its `Theme`, the documentation does not, and neither belongs in
 * a shared hook. What is shared is the part that would otherwise be copied and
 * drift — which key the choice is saved under, when it is safe to write, and
 * how `system` becomes a mode a token can answer to.
 *
 * Dark by default, because that is the studio the tests and the screenshots
 * know. The choice is read from storage after mount and written back only
 * after that read: under StrictMode the effects run twice, and a write before
 * the first read lands the default over whatever was saved.
 *
 * `resolved` exists because a semantic token holds a light reference and a
 * dark one and nothing filed under `system`. The media query behind it is a
 * live subscription — somebody's machine turns dark at sunset with the page
 * open — so it is owned once, here, rather than by each caller.
 */
export interface ColourModePreference {
  /** What was chosen, `system` included. What a control shows. */
  mode: ThemeMode;
  /** What is being drawn. What a semantic token is read by. */
  resolved: ColourMode;
  setMode: (mode: ThemeMode) => void;
}

export function useColourModePreference(
  fallback: ThemeMode = "dark",
): ColourModePreference {
  const [mode, setMode] = useState<ThemeMode>(fallback);
  const [hasLoadedMode, setHasLoadedMode] = useState(false);
  const [prefersDark, setPrefersDark] = useState(false);

  useEffect(() => {
    /* Reading localStorage must happen in an effect: a useState initializer
       would run during SSR, where window does not exist, and desync
       hydration. */
    const stored = window.localStorage.getItem(COLOUR_MODE_STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isThemeMode(stored)) setMode(stored);
    setHasLoadedMode(true);
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setPrefersDark(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!hasLoadedMode) return;
    window.localStorage.setItem(COLOUR_MODE_STORAGE_KEY, mode);
  }, [hasLoadedMode, mode]);

  return { mode, resolved: resolveThemeMode(mode, prefersDark), setMode };
}
