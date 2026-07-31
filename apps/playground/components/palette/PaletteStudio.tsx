"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  formatPaletteCss,
  generateLightnessArray,
  generatePalette,
  normalizeTrackName,
  type ColorTrack,
  type DistributionMode,
} from "@blueprint/ui";
import { PaletteControls } from "./PaletteControls";
import { PaletteMatrix } from "./PaletteMatrix";
import type { ActiveShade, TrackProperty } from "./types";

export function PaletteStudio() {
  // --- 🎨 STATE: Global palette configuration ---
  const [numShades, setNumShades] = useState<number>(15);
  const [distMode, setDistMode] = useState<DistributionMode>("linear");
  const [maxL, setMaxL] = useState<number>(96);
  const [minL, setMinL] = useState<number>(6);
  const [lightnessArray, setLightnessArray] = useState<number[]>([]);

  const [tracks, setTracks] = useState<ColorTrack[]>([
    { id: "1", name: "primary", seedHex: "#7646ab", shades: [] },
    { id: "2", name: "secondary", seedHex: "#008080", shades: [] },
    { id: "3", name: "error", seedHex: "#b02b1b", shades: [] },
  ]);

  const [activeEdit, setActiveEdit] = useState<ActiveShade | null>(null);

  // --- ⚡ Sync lightnessArray when distMode or numShades/maxL/minL changes (except 'custom')
  useEffect(() => {
    if (distMode !== "custom") {
      const newArray = generateLightnessArray(numShades, maxL, minL, distMode);
      setLightnessArray(newArray);
    }
  }, [numShades, distMode, maxL, minL]);

  const handleLightnessChange = useCallback((index: number, value: number) => {
    setLightnessArray((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
    // Switch to custom mode when manually adjusting
    setDistMode("custom");
  }, []);

  const addTrack = () => {
    const randomColors = [
      "#e67e22",
      "#2ecc71",
      "#3498db",
      "#f1c40f",
      "#9b59b6",
    ] as const;
    const randomHex =
      randomColors[Math.floor(Math.random() * randomColors.length)]!;
    setTracks([
      ...tracks,
      {
        id: Date.now().toString(),
        name: `custom-${tracks.length + 1}`,
        seedHex: randomHex,
        shades: [],
      },
    ]);
  };

  const removeTrack = (id: string) => {
    if (tracks.length <= 1) return alert("Must keep at least 1 palette");
    setTracks(tracks.filter((t) => t.id !== id));
    if (activeEdit?.trackId === id) setActiveEdit(null);
  };

  const updateTrackProp = (id: string, key: TrackProperty, value: string) => {
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          return key === "name"
            ? { ...t, name: normalizeTrackName(value) }
            : { ...t, seedHex: value, shades: [] };
        }
        return t;
      }),
    );
  };

  // --- 🧮 ENGINE: Advanced Palette Generation with Auto-Docking ---
  const computedPalettes = useMemo(() => {
    if (lightnessArray.length !== numShades) return [];

    return tracks.map((track) =>
      generatePalette(
        {
          id: track.id,
          name: track.name,
          seedHex: track.seedHex,
        },
        lightnessArray,
      ),
    );
  }, [tracks, numShades, lightnessArray]);

  // --- ⚡ INJECTION: CSS variable injection with stable naming ---
  useEffect(() => {
    const root = document.documentElement;
    computedPalettes.forEach((p) => {
      p.shades.forEach((s) => {
        if (p.name) {
          root.style.setProperty(
            `--color-${p.name}-${s.weight}`,
            `oklch(${s.L.toFixed(3)} ${s.C.toFixed(3)} ${s.H.toFixed(1)})`,
          );
        }
      });
    });
  }, [computedPalettes]);

  const exportAllToClipboard = () => {
    navigator.clipboard.writeText(formatPaletteCss(computedPalettes));
    alert("CSS tokens copied to clipboard!");
  };

  return (
    <div className="bg-neutral-950 border border-neutral-800 rounded-3xl shadow-2xl max-w-full mx-auto overflow-hidden font-sans">
      <header className="bg-neutral-900 border-b border-neutral-800 px-8 py-6 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h2 className="text-xl font-black text-neutral-50 tracking-tight flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-primary-500" /> OKLCH
              Palette Generator
            </h2>
            <p className="text-xs font-medium text-neutral-400">
              Stable 25-interval token naming • Easing curves • Auto-docking
              anchor • Zero token drift
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={addTrack}
              className="bg-primary-600 hover:bg-primary-700 text-neutral-50 font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-lg"
            >
              ＋ Add Palette
            </button>
            <button
              onClick={exportAllToClipboard}
              className="bg-success-600 hover:bg-success-700 text-neutral-50 font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-lg"
            >
              💾 Export CSS
            </button>
          </div>
        </div>

        <PaletteControls
          numShades={numShades}
          distributionMode={distMode}
          maxLightness={maxL}
          minLightness={minL}
          lightnessValues={lightnessArray}
          onNumShadesChange={setNumShades}
          onDistributionModeChange={setDistMode}
          onMaxLightnessChange={setMaxL}
          onMinLightnessChange={setMinL}
          onLightnessChange={handleLightnessChange}
        />
      </header>

      <PaletteMatrix
        palettes={computedPalettes}
        numShades={numShades}
        activeShade={activeEdit}
        onActiveShadeChange={setActiveEdit}
        onTrackChange={updateTrackProp}
        onTrackRemove={removeTrack}
      />
    </div>
  );
}
