"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import {
  BLUEPRINT_20_PRESET,
  Button,
  clampLightnessValue,
  formatPaletteCss,
  generateLightnessArray,
  generatePalette,
  isValidLightnessSequence,
  normalizeHex,
  normalizeTrackName,
  type ColorTrackInput,
} from "@blueprint/ui";
import { PaletteCreation } from "./PaletteCreation";
import { PaletteControls } from "./PaletteControls";
import { PaletteMatrix } from "./PaletteMatrix";
import styles from "./palette-workspace.module.css";
import type { ActiveShade, LightnessPattern, TrackProperty } from "./types";

const SEMANTIC_TRACKS: ColorTrackInput[] = [
  { id: "primary", name: "primary", seedHex: "#7646ab" },
  { id: "neutral", name: "neutral", seedHex: "#737373" },
  { id: "success", name: "success", seedHex: "#2f7d32" },
  { id: "warning", name: "warning", seedHex: "#b87503" },
  { id: "error", name: "error", seedHex: "#b02b1b" },
  { id: "info", name: "info", seedHex: "#2878b8" },
];

const PROJECT_STORAGE_KEY = "blueprint.palette-project.v1";

interface PaletteProject {
  name: string;
  tracks: ColorTrackInput[];
  lightnessPattern: LightnessPattern;
  lightnessValues: number[];
}

function isLightnessPattern(value: unknown): value is LightnessPattern {
  return value === "linear" || value === "ease-in-out" || value === "custom";
}

function createPatternValues(pattern: LightnessPattern): number[] {
  if (pattern === "custom") {
    return [...BLUEPRINT_20_PRESET.lightnessValues];
  }

  return generateLightnessArray(
    BLUEPRINT_20_PRESET.weights.length,
    BLUEPRINT_20_PRESET.lightnessValues[0]!,
    BLUEPRINT_20_PRESET.lightnessValues.at(-1)!,
    pattern,
  );
}

function readStoredProject(): PaletteProject | null {
  try {
    const stored = window.localStorage.getItem(PROJECT_STORAGE_KEY);
    if (!stored) return null;

    const parsed: unknown = JSON.parse(stored);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !("name" in parsed) ||
      typeof parsed.name !== "string" ||
      !("tracks" in parsed) ||
      !Array.isArray(parsed.tracks)
    ) {
      return null;
    }

    const tracks = parsed.tracks.flatMap((track): ColorTrackInput[] => {
      if (
        !track ||
        typeof track !== "object" ||
        !("id" in track) ||
        typeof track.id !== "string" ||
        !("name" in track) ||
        typeof track.name !== "string" ||
        !("seedHex" in track) ||
        typeof track.seedHex !== "string"
      ) {
        return [];
      }

      try {
        return [
          {
            id: track.id,
            name: normalizeTrackName(track.name),
            seedHex: normalizeHex(track.seedHex),
          },
        ];
      } catch {
        return [];
      }
    });

    if (tracks.length === 0) return null;

    let lightnessPattern: LightnessPattern = "custom";
    let lightnessValues = createPatternValues("custom");

    if (
      "lightnessValues" in parsed &&
      Array.isArray(parsed.lightnessValues) &&
      parsed.lightnessValues.every(
        (value): value is number => typeof value === "number",
      ) &&
      isValidLightnessSequence(
        parsed.lightnessValues,
        BLUEPRINT_20_PRESET.weights.length,
      )
    ) {
      lightnessValues = [...parsed.lightnessValues];

      if (
        "lightnessPattern" in parsed &&
        isLightnessPattern(parsed.lightnessPattern)
      ) {
        lightnessPattern = parsed.lightnessPattern;
      }
    }

    return {
      name: parsed.name,
      tracks,
      lightnessPattern,
      lightnessValues,
    };
  } catch {
    return null;
  }
}

function createDefaultTracks(primarySeed: string): ColorTrackInput[] {
  return SEMANTIC_TRACKS.map((track) =>
    track.id === "primary" ? { ...track, seedHex: primarySeed } : { ...track },
  );
}

export function PaletteStudio() {
  const [project, setProject] = useState<PaletteProject | null>(null);
  const [hasLoadedProject, setHasLoadedProject] = useState(false);
  const [activeShade, setActiveShade] = useState<ActiveShade | null>(null);
  const [copyStatus, setCopyStatus] = useState("Export CSS");

  useEffect(() => {
    setProject(readStoredProject());
    setHasLoadedProject(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedProject) return;

    if (project) {
      window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));
    } else {
      window.localStorage.removeItem(PROJECT_STORAGE_KEY);
    }
  }, [hasLoadedProject, project]);

  const palettes = useMemo(
    () =>
      project?.tracks.map((track) =>
        generatePalette(
          track,
          project.lightnessValues,
          BLUEPRINT_20_PRESET.weights,
        ),
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

  if (!hasLoadedProject) {
    return <main className={styles.loadingPage}>Loading palette…</main>;
  }

  if (!project) {
    return (
      <PaletteCreation
        onCreate={({ name, seedHex, method }) => {
          const primarySeed =
            method === "generated" ? "#3b66f5" : normalizeHex(seedHex);
          setProject({
            name,
            tracks: createDefaultTracks(primarySeed),
            lightnessPattern: "custom",
            lightnessValues: createPatternValues("custom"),
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

  const removeTrack = (id: string) => {
    setProject((current) => {
      if (!current || current.tracks.length === 1) return current;
      return {
        ...current,
        tracks: current.tracks.filter((track) => track.id !== id),
      };
    });
    setActiveShade((current) => (current?.trackId === id ? null : current));
  };

  const moveTrack = (id: string, direction: -1 | 1) => {
    setProject((current) => {
      if (!current) return current;

      const sourceIndex = current.tracks.findIndex((track) => track.id === id);
      const targetIndex = sourceIndex + direction;
      if (
        sourceIndex < 0 ||
        targetIndex < 0 ||
        targetIndex >= current.tracks.length
      ) {
        return current;
      }

      const tracks = [...current.tracks];
      const [track] = tracks.splice(sourceIndex, 1);
      tracks.splice(targetIndex, 0, track!);
      return { ...current, tracks };
    });
  };

  const changeLightnessPattern = (pattern: LightnessPattern) => {
    setProject((current) =>
      current
        ? {
            ...current,
            lightnessPattern: pattern,
            lightnessValues:
              pattern === "custom"
                ? current.lightnessValues
                : createPatternValues(pattern),
          }
        : current,
    );
  };

  const updateLightness = (index: number, value: number) => {
    setProject((current) => {
      if (!current) return current;

      const lightnessValues = [...current.lightnessValues];
      lightnessValues[index] = clampLightnessValue(
        current.lightnessValues,
        index,
        value,
      );

      return {
        ...current,
        lightnessPattern: "custom",
        lightnessValues,
      };
    });
  };

  const resetLightness = () => {
    setProject((current) =>
      current
        ? {
            ...current,
            lightnessPattern: "custom",
            lightnessValues: createPatternValues("custom"),
          }
        : current,
    );
    setActiveShade(null);
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
          <TabList size="sm" value="shade-generator" onChange={() => undefined}>
            <Tab label="Overview" value="overview" />
            <Tab label="Shade generator" value="shade-generator" />
            <Tab label="Preview" value="preview" />
          </TabList>
        </nav>
        <Button
          className={styles.exportButton}
          scheme="neutral"
          size="small"
          variant="outlined"
          onClick={exportCss}
        >
          {copyStatus}
        </Button>
      </header>

      <section aria-label="Palette toolbar" className={styles.toolbar}>
        <Button
          className={styles.addButton}
          scheme="neutral"
          size="small"
          variant="outlined"
          leftIcon={<span aria-hidden="true">＋</span>}
          onClick={() =>
            setProject((current) =>
              current
                ? {
                    ...current,
                    tracks: [
                      ...current.tracks,
                      {
                        id: `custom-${Date.now()}`,
                        name: `custom-${current.tracks.length + 1}`,
                        seedHex: "#8b5cf6",
                      },
                    ],
                  }
                : current,
            )
          }
        >
          Add colour
        </Button>
        <span className={styles.toolbarDivider} />
        <Badge label="Blueprint 20" variant="purple" />
        <Badge label="OKLCH" variant="neutral" />
        <Button
          className={styles.resetButton}
          scheme="neutral"
          size="xs"
          variant="text"
          onClick={resetLightness}
        >
          Reset preset
        </Button>
        <Button
          className={styles.newProjectButton}
          scheme="neutral"
          size="xs"
          variant="text"
          onClick={() => {
            setProject(null);
            setActiveShade(null);
          }}
        >
          New project
        </Button>
      </section>

      <section className={styles.editor}>
        <section aria-label="Generated colour shades" className={styles.canvas}>
          <PaletteMatrix
            palettes={palettes}
            activeShade={activeShade}
            onActiveShadeChange={setActiveShade}
            onTrackChange={updateTrack}
            onTrackMove={moveTrack}
            onTrackRemove={removeTrack}
          />
        </section>

        <PaletteControls
          lightnessPattern={project.lightnessPattern}
          lightnessValues={project.lightnessValues}
          selectedPalette={selectedPalette}
          selectedShade={selectedShade}
          onLightnessChange={updateLightness}
          onPatternChange={changeLightnessPattern}
          onResetLightness={resetLightness}
        />
      </section>
    </main>
  );
}
