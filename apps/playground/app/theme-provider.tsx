"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { Theme } from "@astryxdesign/core/theme";
import { LayerProvider } from "@astryxdesign/core/Layer";
import { neutralTheme } from "@astryxdesign/theme-neutral/built";
import {
  useColourModePreference,
  WorkspaceStoreProvider,
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
 * The one place the mode lives.
 *
 * What actually flips the studio is Astryx's `Theme`: it puts a class on its
 * wrapper that sets `color-scheme`, which is what every `light-dark()` token
 * beneath it resolves against, and it writes `data-theme` onto `<html>` for
 * the root rules. Nothing else can — setting the attribute by hand leaves
 * the class where it was, and the controls stay in the old mode. Measured,
 * after a screenshot of "light mode" came back dark.
 *
 * The state, the storage key and the media query are `useColourModePreference`
 * in @blueprint/ui, shared with the documentation app so the two agree about
 * where the choice is kept. What is left here is what is this application's:
 * which Astryx theme, and a toast layer the documentation has no use for.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const preference = useColourModePreference();

  useEffect(() => {
    const observers = new WeakMap<HTMLElement, MutationObserver>();

    const clampPopup = (target: HTMLElement) => {
      const popup = target.querySelector(".astryx-selector-popup");
      if (!popup) return;
      const margin = parseFloat(target.style.marginBlockStart || "0");
      const listbox = target.querySelector(
        '[role="listbox"]',
      ) as HTMLElement | null;
      const listboxHeight = listbox?.offsetHeight || target.offsetHeight || 300;
      if (Math.abs(margin) > listboxHeight) {
        target.style.marginBlockStart = `-${listboxHeight}px`;
      }
    };

    const handleToggle = (event: Event) => {
      const toggleEvent = event as ToggleEvent;
      const target = toggleEvent.target as HTMLElement | null;
      if (!target) return;

      if (toggleEvent.newState === "closed") {
        observers.get(target)?.disconnect();
        observers.delete(target);
        return;
      }

      if (toggleEvent.newState !== "open") return;

      observers.get(target)?.disconnect();
      clampPopup(target);
      const observer = new MutationObserver(() => {
        clampPopup(target);
      });
      observer.observe(target, {
        attributes: true,
        attributeFilter: ["style"],
      });
      observers.set(target, observer);
    };

    document.addEventListener("toggle", handleToggle, true);
    return () => {
      document.removeEventListener("toggle", handleToggle, true);
    };
  }, []);

  return (
    <ThemeModeContext.Provider value={preference}>
      <Theme theme={neutralTheme} mode={preference.mode}>
        <LayerProvider toast={{ position: "bottomEnd", maxVisible: 2 }}>
          <WorkspaceStoreProvider>{children}</WorkspaceStoreProvider>
        </LayerProvider>
      </Theme>
    </ThemeModeContext.Provider>
  );
}
