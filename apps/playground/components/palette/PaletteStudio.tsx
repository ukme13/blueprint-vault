"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { ResizeHandle, useResizable } from "@astryxdesign/core/Resizable";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { Tooltip } from "@astryxdesign/core/Tooltip";
import {
  BLUEPRINT_20_PRESET,
  Button,
  MAX_SHADE_COUNT,
  clampLightnessValue,
  formatPaletteCss,
  generateLightnessArray,
  generatePalette,
  generateStableWeights,
  isValidLightnessSequence,
  normalizeHex,
  normalizeTrackAdjustments,
  normalizeTrackName,
  resizeLightnessArray,
  type ColorTrackInput,
  type TrackAdjustments,
} from "@blueprint/ui";
import { PaletteCreation } from "./PaletteCreation";
import { PaletteControls } from "./PaletteControls";
import { ColourPicker } from "./ColourPicker";
import { PaletteMatrix } from "./PaletteMatrix";
import { PaletteOverview } from "./PaletteOverview";
import { PalettePreview } from "./PalettePreview";
import { TrackDetailDialog } from "./TrackDetailDialog";
import styles from "./palette-workspace.module.css";
import {
  MIN_SHADE_COUNT,
  type ActiveShade,
  type LightnessPattern,
  type TrackProperty,
} from "./types";
import { useCopyFeedback } from "./useCopyFeedback";
import { ColourFormatProvider } from "./ColourFormatContext";

const SEMANTIC_TRACKS: ColorTrackInput[] = [
  { id: "primary", name: "primary", seedHex: "#7646ab" },
  { id: "neutral", name: "neutral", seedHex: "#737373" },
  { id: "success", name: "success", seedHex: "#2f7d32" },
  { id: "warning", name: "warning", seedHex: "#b87503" },
  { id: "error", name: "error", seedHex: "#b02b1b" },
  { id: "info", name: "info", seedHex: "#2878b8" },
];

type ContrastTarget = "white" | "black" | "custom";

const PROJECT_STORAGE_KEY = "blueprint.palette-project.v1";
type PlaygroundSection = "overview" | "shade-generator" | "preview";

interface PaletteProject {
  name: string;
  tracks: ColorTrackInput[];
  lightnessPattern: LightnessPattern;
  lightnessValues: number[];
}

function readAdjustmentRecord(value: unknown): Record<number, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value).flatMap(([weight, hex]) => {
      const numericWeight = Number(weight);
      if (!Number.isInteger(numericWeight) || typeof hex !== "string") {
        return [];
      }

      try {
        return [[numericWeight, normalizeHex(hex)]];
      } catch {
        return [];
      }
    }),
  );
}

function readTrackAdjustments(value: unknown): TrackAdjustments {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { anchors: {}, manualOverrides: {} };
  }

  return {
    anchors: readAdjustmentRecord(
      "anchors" in value ? value.anchors : undefined,
    ),
    manualOverrides: readAdjustmentRecord(
      "manualOverrides" in value ? value.manualOverrides : undefined,
    ),
  };
}

function isLightnessPattern(value: unknown): value is LightnessPattern {
  return value === "linear" || value === "ease-in-out" || value === "custom";
}

function createPatternValues(
  pattern: LightnessPattern,
  shadeCount = BLUEPRINT_20_PRESET.weights.length,
  maxLightness = BLUEPRINT_20_PRESET.lightnessValues[0]!,
  minLightness = BLUEPRINT_20_PRESET.lightnessValues.at(-1)!,
): number[] {
  if (
    pattern === "custom" &&
    shadeCount === BLUEPRINT_20_PRESET.weights.length
  ) {
    return [...BLUEPRINT_20_PRESET.lightnessValues];
  }

  return generateLightnessArray(
    shadeCount,
    maxLightness,
    minLightness,
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
            adjustments: readTrackAdjustments(
              "adjustments" in track ? track.adjustments : undefined,
            ),
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
      parsed.lightnessValues.length >= MIN_SHADE_COUNT &&
      parsed.lightnessValues.length <= MAX_SHADE_COUNT &&
      isValidLightnessSequence(parsed.lightnessValues)
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
  return (
    <ColourFormatProvider>
      <PaletteStudioContent />
    </ColourFormatProvider>
  );
}

function PaletteStudioContent() {
  const [project, setProject] = useState<PaletteProject | null>(null);
  const [hasLoadedProject, setHasLoadedProject] = useState(false);
  const [activeShade, setActiveShade] = useState<ActiveShade | null>(null);
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [isContrastModeOpen, setIsContrastModeOpen] = useState(false);
  const [contrastTarget, setContrastTarget] = useState<ContrastTarget>("white");
  const [customContrastColour, setCustomContrastColour] = useState("#7646ab");
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false);
  const [activeSection, setActiveSection] =
    useState<PlaygroundSection>("shade-generator");
  const { copyText, status: exportStatus } = useCopyFeedback();
  const settingsPanel = useResizable({
    autoSaveId: "blueprint-palette-settings",
    defaultSize: 350,
    minSizePx: 300,
    maxSizePx: 560,
  });

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

  const weights = useMemo(() => {
    const shadeCount = project?.lightnessValues.length ?? 0;
    if (shadeCount === 0) return [];
    return shadeCount === BLUEPRINT_20_PRESET.weights.length
      ? [...BLUEPRINT_20_PRESET.weights]
      : generateStableWeights(shadeCount);
  }, [project?.lightnessValues.length]);

  const palettes = useMemo(
    () =>
      project?.tracks.map((track) =>
        generatePalette(track, project.lightnessValues, weights),
      ) ?? [],
    [project, weights],
  );
  const activeTrack =
    palettes.find((palette) => palette.id === activeTrackId) ?? null;

  const wcagComparisonHex =
    contrastTarget === "white"
      ? "#ffffff"
      : contrastTarget === "black"
        ? "#000000"
        : customContrastColour;

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
    return (
      <main
        aria-busy="true"
        aria-live="polite"
        className={styles.loadingPage}
        role="status"
      >
        Loading palette…
      </main>
    );
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
    setActiveTrackId((current) => (current === id ? null : current));
  };

  const saveTrack = (id: string, name: string, seedHex: string) => {
    setProject((current) =>
      current
        ? {
            ...current,
            tracks: current.tracks.map((track) =>
              track.id === id
                ? {
                    ...track,
                    name: normalizeTrackName(name),
                    seedHex: normalizeHex(seedHex),
                  }
                : track,
            ),
          }
        : current,
    );
  };

  const duplicateTrack = (id: string, name: string, seedHex: string) => {
    setProject((current) => {
      if (!current) return current;
      const sourceIndex = current.tracks.findIndex((track) => track.id === id);
      if (sourceIndex < 0) return current;

      const tracks = [...current.tracks];
      tracks.splice(sourceIndex + 1, 0, {
        id: `custom-${Date.now()}`,
        name: normalizeTrackName(`${name}-copy`),
        seedHex: normalizeHex(seedHex),
        adjustments: normalizeTrackAdjustments(
          current.tracks[sourceIndex]!.adjustments,
        ),
      });
      return { ...current, tracks };
    });
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

  const reorderTrack = (
    sourceId: string,
    targetId: string,
    position: "before" | "after",
  ) => {
    setProject((current) => {
      if (!current || sourceId === targetId) return current;

      const tracks = [...current.tracks];
      const sourceIndex = tracks.findIndex((track) => track.id === sourceId);
      if (sourceIndex < 0) return current;

      const [movedTrack] = tracks.splice(sourceIndex, 1);
      const targetIndex = tracks.findIndex((track) => track.id === targetId);
      if (!movedTrack || targetIndex < 0) return current;

      tracks.splice(
        position === "after" ? targetIndex + 1 : targetIndex,
        0,
        movedTrack,
      );
      return { ...current, tracks };
    });
  };

  const updateProjectName = (name: string) => {
    setProject((current) => (current ? { ...current, name } : current));
  };

  const changeTrackAnchor = (
    trackId: string,
    weight: number,
    hex: string | null,
  ) => {
    setProject((current) => {
      if (!current) return current;

      return {
        ...current,
        tracks: current.tracks.map((track) => {
          if (track.id !== trackId) return track;

          const adjustments = normalizeTrackAdjustments(track.adjustments);
          const anchors = { ...adjustments.anchors };
          const manualOverrides = { ...adjustments.manualOverrides };

          if (hex === null) {
            delete anchors[weight];
          } else {
            anchors[weight] = normalizeHex(hex);
            delete manualOverrides[weight];
          }

          return {
            ...track,
            adjustments: { anchors, manualOverrides },
          };
        }),
      };
    });
  };

  const changeManualOverride = (
    trackId: string,
    weight: number,
    hex: string | null,
  ) => {
    setProject((current) => {
      if (!current) return current;

      return {
        ...current,
        tracks: current.tracks.map((track) => {
          if (track.id !== trackId) return track;

          const adjustments = normalizeTrackAdjustments(track.adjustments);
          const anchors = { ...adjustments.anchors };
          const manualOverrides = { ...adjustments.manualOverrides };

          if (hex === null) {
            delete manualOverrides[weight];
          } else {
            manualOverrides[weight] = normalizeHex(hex);
            delete anchors[weight];
          }

          return {
            ...track,
            adjustments: { anchors, manualOverrides },
          };
        }),
      };
    });
  };

  const resetTrackAdjustments = (trackId: string) => {
    setProject((current) => {
      if (!current) return current;

      return {
        ...current,
        tracks: current.tracks.map((track) =>
          track.id === trackId
            ? {
                ...track,
                adjustments: { anchors: {}, manualOverrides: {} },
              }
            : track,
        ),
      };
    });
    setActiveShade((current) =>
      current?.trackId === trackId ? null : current,
    );
  };

  const commitProjectName = () => {
    setProject((current) => {
      if (!current) return current;
      return { ...current, name: current.name.trim() || "Untitled project" };
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
                : createPatternValues(
                    pattern,
                    current.lightnessValues.length,
                    current.lightnessValues[0],
                    current.lightnessValues.at(-1),
                  ),
          }
        : current,
    );
  };

  const changeShadeCount = (nextShadeCount: number) => {
    const shadeCount = Math.min(
      MAX_SHADE_COUNT,
      Math.max(MIN_SHADE_COUNT, Math.round(nextShadeCount)),
    );

    setProject((current) => {
      if (!current || current.lightnessValues.length === shadeCount) {
        return current;
      }

      const maxLightness = current.lightnessValues[0]!;
      const minLightness = current.lightnessValues.at(-1)!;
      const lightnessValues =
        current.lightnessPattern === "custom"
          ? resizeLightnessArray(current.lightnessValues, shadeCount)
          : createPatternValues(
              current.lightnessPattern,
              shadeCount,
              maxLightness,
              minLightness,
            );

      return {
        ...current,
        lightnessValues,
      };
    });
    setActiveShade(null);
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
    await copyText(formatPaletteCss(palettes));
  };

  const exportLabel =
    exportStatus === "copied"
      ? "Copied"
      : exportStatus === "error"
        ? "Copy failed"
        : "Export CSS";

  return (
    <main className={styles.workspace}>
      <header className={styles.topbar}>
        <p className={styles.brand}>
          <span aria-hidden="true" className={styles.brandMark}>
            B
          </span>
          Blueprint
          <span className={styles.breadcrumb}>/</span>
          <input
            aria-label="Project name"
            className={styles.projectNameInput}
            maxLength={80}
            spellCheck={false}
            value={project.name}
            onBlur={commitProjectName}
            onChange={(event) => updateProjectName(event.target.value)}
          />
        </p>
        <nav aria-label="Playground sections" className={styles.navigation}>
          <TabList
            size="sm"
            value={activeSection}
            onChange={(value) => setActiveSection(value as PlaygroundSection)}
          >
            <Tab label="Overview" value="overview" />
            <Tab label="Shade generator" value="shade-generator" />
            <Tab label="Preview" value="preview" />
          </TabList>
        </nav>
        <Button
          aria-label="Export palette CSS"
          className={styles.exportButton}
          scheme="neutral"
          size="small"
          variant="outlined"
          onClick={exportCss}
        >
          {exportLabel}
        </Button>
        <span
          aria-live="polite"
          className={styles.visuallyHidden}
          role="status"
        >
          {exportStatus === "copied"
            ? "Palette CSS copied to clipboard."
            : exportStatus === "error"
              ? "Could not copy the palette CSS."
              : ""}
        </span>
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
        <Tooltip
          content="Below 3:1 fails. Normal text needs 4.5:1 for AA and 7:1 for AAA."
          hasHoverIndication={false}
          placement="below"
        >
          <Button
            aria-pressed={isContrastModeOpen}
            className={styles.contrastModeButton}
            data-active={isContrastModeOpen}
            scheme="neutral"
            size="small"
            variant="outlined"
            onClick={() => setIsContrastModeOpen((current) => !current)}
          >
            WCAG 2
          </Button>
        </Tooltip>
        {isContrastModeOpen && (
          <section
            aria-label="Contrast comparison"
            className={styles.contrastOptions}
          >
            <small>against</small>
            <span className={styles.contrastTargetControl}>
              <SegmentedControl
                label="Contrast comparison colour"
                layout="fill"
                size="sm"
                value={contrastTarget}
                onChange={(value) => setContrastTarget(value as ContrastTarget)}
              >
                <SegmentedControlItem label="White" value="white" />
                <SegmentedControlItem label="Black" value="black" />
                <SegmentedControlItem label="Custom" value="custom" />
              </SegmentedControl>
            </span>
            {contrastTarget === "custom" && (
              <span className={styles.customContrastPicker}>
                <ColourPicker
                  label="custom contrast colour"
                  value={customContrastColour}
                  onChange={setCustomContrastColour}
                />
              </span>
            )}
          </section>
        )}
        <span className={styles.toolbarDivider} />
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
          onClick={() => setIsNewProjectDialogOpen(true)}
        >
          New project
        </Button>
      </section>

      {activeSection === "overview" && (
        <PaletteOverview
          projectName={project.name}
          palettes={palettes}
          lightnessPattern={project.lightnessPattern}
          onSourceColourChange={(id, value) =>
            updateTrack(id, "seedHex", value)
          }
        />
      )}

      {activeSection === "preview" && <PalettePreview palettes={palettes} />}

      {activeSection === "shade-generator" && (
        <section
          className={styles.editor}
          style={
            {
              "--inspector-width": `${settingsPanel.size}px`,
            } as CSSProperties
          }
        >
          <section
            aria-label="Generated colour shades"
            className={styles.canvas}
          >
            <PaletteMatrix
              palettes={palettes}
              weights={weights}
              activeShade={activeShade}
              wcagComparisonHex={wcagComparisonHex}
              wcagComparisonLabel={contrastTarget}
              contrastReferenceHex={
                isContrastModeOpen ? wcagComparisonHex : undefined
              }
              onActiveShadeChange={setActiveShade}
              onAnchorChange={changeTrackAnchor}
              onManualChange={changeManualOverride}
              onTrackChange={updateTrack}
              onTrackOpen={setActiveTrackId}
              onTrackMove={moveTrack}
              onTrackReorder={reorderTrack}
            />
          </section>

          <ResizeHandle
            className={styles.resizeHandle}
            direction="horizontal"
            hasDivider
            isReversed
            label="Resize palette settings"
            pillPlacement="center"
            resizable={settingsPanel.props}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft") {
                event.preventDefault();
                settingsPanel.resize(settingsPanel.size + 10);
              }
              if (event.key === "ArrowRight") {
                event.preventDefault();
                settingsPanel.resize(settingsPanel.size - 10);
              }
              if (event.key === "Home") {
                event.preventDefault();
                settingsPanel.resize(300);
              }
              if (event.key === "End") {
                event.preventDefault();
                settingsPanel.resize(560);
              }
            }}
          />

          <PaletteControls
            lightnessPattern={project.lightnessPattern}
            lightnessValues={project.lightnessValues}
            weights={weights}
            onLightnessChange={updateLightness}
            onPatternChange={changeLightnessPattern}
            onResetLightness={resetLightness}
            onShadeCountChange={changeShadeCount}
          />
        </section>
      )}

      <TrackDetailDialog
        canDelete={palettes.length > 1}
        isOpen={activeTrack !== null}
        lightnessValues={project.lightnessValues}
        palette={activeTrack}
        onDelete={removeTrack}
        onDuplicate={duplicateTrack}
        onOpenChange={(isOpen) => {
          if (!isOpen) setActiveTrackId(null);
        }}
        onResetAdjustments={resetTrackAdjustments}
        onSave={saveTrack}
        weights={weights}
      />

      <AlertDialog
        actionLabel="Start new project"
        className={styles.newProjectDialog}
        description="This removes the current palette from this browser. Export it first if you want to keep it."
        isOpen={isNewProjectDialogOpen}
        title="Start a new project?"
        onAction={() => {
          setIsNewProjectDialogOpen(false);
          setProject(null);
          setActiveShade(null);
          setActiveTrackId(null);
          setIsContrastModeOpen(false);
        }}
        onOpenChange={setIsNewProjectDialogOpen}
      />
    </main>
  );
}
