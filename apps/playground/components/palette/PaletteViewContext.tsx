"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_PALETTE_VIEW,
  PALETTE_VIEW_STORAGE_KEY,
  activeSimulation,
  readPaletteView,
  simulateHex,
  writePaletteView,
  type ColourVisionDeficiency,
  type ColourVisionSimulation,
  type PaletteViewPreferences,
} from "@blueprint/ui";

interface PaletteViewContextValue extends PaletteViewPreferences {
  /** What to render through: the chosen deficiency, or "normal" when off. */
  simulation: ColourVisionSimulation;
  /** A colour as it should be shown. The identity while simulation is off. */
  seen: (hex: string) => string;
  setDeficiency: (deficiency: ColourVisionDeficiency) => void;
  toggleSimulation: () => void;
  toggleContrastMode: () => void;
  closeContrastMode: () => void;
}

const PaletteViewContext = createContext<PaletteViewContextValue | null>(null);

/**
 * How the palette is being looked at, kept per device.
 *
 * Both modes together, because they are one decision from the user's side and
 * because splitting them would leave two neighbouring toggles behaving
 * differently — the simulation surviving a reload while the contrast panel
 * forgot itself.
 */
export function PaletteViewProvider({ children }: { children: ReactNode }) {
  const [view, setView] =
    useState<PaletteViewPreferences>(DEFAULT_PALETTE_VIEW);
  const [hasLoadedView, setHasLoadedView] = useState(false);

  useEffect(() => {
    /* Reading localStorage must happen in an effect: a useState initializer
       would run during SSR, where window does not exist, and desync
       hydration. */
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setView(
      readPaletteView(window.localStorage.getItem(PALETTE_VIEW_STORAGE_KEY)),
    );
    setHasLoadedView(true);
  }, []);

  useEffect(() => {
    /* Nothing is written until the read above has run, or the write persists
       the defaults over whatever was stored. In production that self-corrects
       on the next render, but under StrictMode the effects run twice and the
       second read sees the clobbered defaults — so a chosen mode never
       survived a reload in dev. Same guard as ColourFormatProvider and
       PaletteStudio, and the third place this has been needed. */
    if (!hasLoadedView) return;
    window.localStorage.setItem(
      PALETTE_VIEW_STORAGE_KEY,
      writePaletteView(view),
    );
  }, [hasLoadedView, view]);

  const simulation = activeSimulation(view);

  return (
    <PaletteViewContext.Provider
      value={{
        ...view,
        simulation,
        seen: (hex) => simulateHex(hex, simulation),
        setDeficiency: (deficiency) =>
          /* Choosing a mode turns the chip on. Picking from a list you had to
             open the chip to reach and having nothing happen would be its own
             small bug. */
          setView((current) => ({
            ...current,
            deficiency,
            isSimulationOn: true,
          })),
        toggleSimulation: () =>
          setView((current) => ({
            ...current,
            isSimulationOn: !current.isSimulationOn,
          })),
        toggleContrastMode: () =>
          setView((current) => ({
            ...current,
            isContrastModeOpen: !current.isContrastModeOpen,
          })),
        closeContrastMode: () =>
          setView((current) => ({ ...current, isContrastModeOpen: false })),
      }}
    >
      {children}
    </PaletteViewContext.Provider>
  );
}

export function usePaletteView() {
  const context = useContext(PaletteViewContext);
  if (!context)
    throw new Error("usePaletteView must be used inside PaletteViewProvider.");
  return context;
}
