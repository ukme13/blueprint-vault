"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BLUEPRINT_20_PRESET,
  formatPaletteCss,
  generatePaletteFromPreset,
  normalizeHex,
  normalizeTrackName,
  type ColorTrackInput,
} from "@blueprint/ui";
import { PaletteCreation } from "./PaletteCreation";
import { PaletteControls } from "./PaletteControls";
import { PaletteMatrix } from "./PaletteMatrix";
import styles from "./palette-workspace.module.css";
import type { ActiveShade, TrackProperty } from "./types";

const SEMANTIC_TRACKS: ColorTrackInput[] = [
  { id: "primary", name: "primary", seedHex: "#7646ab" },
  { id: "neutral", name: "neutral", seedHex: "#737373" },
  { id: "success", name: "success", seedHex: "#2f7d32" },
  { id: "warning", name: "warning", seedHex: "#b87503" },
  { id: "error", name: "error", seedHex: "#b02b1b" },
  { id: "info", name: "info", seedHex: "#2878b8" },
];

interface PaletteProject {
  name: string;
  tracks: ColorTrackInput[];
}

export function PaletteStudio() {
  const [project, setProject] = useState<PaletteProject | null>(null);
  const [activeShade, setActiveShade] = useState<ActiveShade | null>(null);
  const [copyStatus, setCopyStatus] = useState("Export CSS");

  const palettes = useMemo(
    () =>
      project?.tracks.map((track) =>
        generatePaletteFromPreset(track, BLUEPRINT_20_PRESET),
      ) ?? [],
    [project],
  );

  useEffect(() => {
    palettes.forEach((palette) => {
      palette.shades.forEach((shade) => {
        document.documentElement.style.setProperty(
          `--color-${palette.name}-${shade.weight}`,
          `oklch(${shade.L.toFixed(3)} ${shade.C.toFixed(3)} ${shade.H.toFixed(1)})`,
        );
      });
    });
  }, [palettes]);

  if (!project) {
    return (
      <PaletteCreation
        onCreate={({ name, seedHex, method }) => {
          const primarySeed =
            method === "generated" ? "#3b66f5" : normalizeHex(seedHex);
          setProject({
            name,
            tracks: SEMANTIC_TRACKS.map((track) =>
              track.id === "primary"
                ? { ...track, seedHex: primarySeed }
                : track,
            ),
          });
        }}
      />
    );
  }

  const selectedPalette = palettes.find(
    (palette) => palette.id === activeShade?.trackId,
  );
  const selectedShade = selectedPalette?.shades.find(
    (shade) => shade.weight === activeShade?.weight,
  );

  const updateTrack = (id: string, property: TrackProperty, value: string) => {
    setProject((current) => {
      if (!current) return current;

      return {
        ...current,
        tracks: current.tracks.map((track) =>
          track.id === id
            ? {
                ...track,
                [property]:
                  property === "name" ? normalizeTrackName(value) : value,
              }
            : track,
        ),
      };
    });
  };

  const exportCss = async () => {
    await navigator.clipboard.writeText(formatPaletteCss(palettes));
    setCopyStatus("Copied");
    window.setTimeout(() => setCopyStatus("Export CSS"), 1600);
  };

  return (
    <main className={styles.workspace}>
      <header className={styles.topbar}>
        <p className={styles.brand}>
          <span aria-hidden="true" className={styles.brandMark}>
            B
          </span>
          Blueprint
          <span className={styles.breadcrumb}>/</span>
          <strong>{project.name}</strong>
        </p>
        <nav aria-label="Playground sections" className={styles.navigation}>
          <button type="button">Overview</button>
          <button aria-current="page" type="button">
            Shade generator
          </button>
          <button type="button">Preview</button>
        </nav>
        <button
          className={styles.exportButton}
          type="button"
          onClick={exportCss}
        >
          {copyStatus}
        </button>
      </header>

      <section aria-label="Palette toolbar" className={styles.toolbar}>
        <button
          className={styles.addButton}
          type="button"
          onClick={() =>
            setProject((current) =>
              current
                ? {
                    ...current,
                    tracks: [
                      ...current.tracks,
                      {
                        id: `custom-${current.tracks.length + 1}`,
                        name: `custom-${current.tracks.length + 1}`,
                        seedHex: "#8b5cf6",
                      },
                    ],
                  }
                : current,
            )
          }
        >
          <span aria-hidden="true">＋</span> Add colour
        </button>
        <span className={styles.toolbarDivider} />
        <span className={styles.toolChip}>Blueprint 20</span>
        <span className={styles.toolChip}>OKLCH</span>
        <button
          className={styles.newProjectButton}
          type="button"
          onClick={() => {
            setProject(null);
            setActiveShade(null);
          }}
        >
          New project
        </button>
      </section>

      <section className={styles.editor}>
        <section aria-label="Generated colour shades" className={styles.canvas}>
          <PaletteMatrix
            palettes={palettes}
            activeShade={activeShade}
            onActiveShadeChange={setActiveShade}
            onTrackChange={updateTrack}
          />
        </section>

        <PaletteControls
          selectedPalette={selectedPalette}
          selectedShade={selectedShade}
        />
      </section>
    </main>
  );
}
