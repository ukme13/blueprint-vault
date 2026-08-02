"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { isColourFormat, type ColourFormat } from "@blueprint/ui";

const STORAGE_KEY = "blueprint.colour-format.v1";

interface ColourFormatContextValue {
  colourFormat: ColourFormat;
  setColourFormat: (format: ColourFormat) => void;
}

const ColourFormatContext = createContext<ColourFormatContextValue | null>(
  null,
);

export function ColourFormatProvider({ children }: { children: ReactNode }) {
  const [colourFormat, setColourFormat] = useState<ColourFormat>("hex");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isColourFormat(stored)) setColourFormat(stored);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, colourFormat);
  }, [colourFormat]);

  return (
    <ColourFormatContext.Provider value={{ colourFormat, setColourFormat }}>
      {children}
    </ColourFormatContext.Provider>
  );
}

export function useColourFormat() {
  const context = useContext(ColourFormatContext);
  if (!context)
    throw new Error(
      "useColourFormat must be used inside ColourFormatProvider.",
    );
  return context;
}
