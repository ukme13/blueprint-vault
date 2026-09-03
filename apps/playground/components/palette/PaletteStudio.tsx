"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
} from "react";
import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { ResizeHandle, useResizable } from "@astryxdesign/core/Resizable";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { Tooltip } from "@astryxdesign/core/Tooltip";
import { useToast } from "@astryxdesign/core/Toast";
import {
  BLUEPRINT_20_PRESET,
  Button,
  DEFAULT_WORKSPACE_NAME,
  MAX_SHADE_COUNT,
  browserWorkspaceStorage,
  emptyWorkspace,
  loadStoredWorkspace,
  saveStoredWorkspace,
  updateStoredWorkspace,
  withPaletteSlice,
  withSemanticsSlice,
  withSharedName,
  type WorkspaceProject,
  defaultLightnessValues,
  clampLightnessValue,
  generatePalettes,
  generateStableWeights,
  normalizeHex,
  normalizeTrackAdjustments,
  normalizeTrackName,
  parseBlueprintWorkspace,
  resizeLightnessArray,
  type ColorTrackInput,
  type PaletteProjectData,
  type SemanticToken,
} from "@blueprint/ui";
import { SystemExportDialog } from "../SystemExportDialog";
import { VisionControl } from "../VisionControl";
import { WorkspaceBrand } from "../WorkspaceBrand";
import { StudioThemeControl } from "../StudioThemeControl";
import { WorkspaceNav } from "../WorkspaceNav";
import { PaletteCreation } from "./PaletteCreation";
import { PaletteControls } from "./PaletteControls";
import { ColourPicker } from "./ColourPicker";
import { PaletteMatrix } from "./PaletteMatrix";
import { PaletteOverview } from "./PaletteOverview";
import { PalettePreview } from "./PalettePreview";
import { SemanticEditor } from "./SemanticEditor";
import { TrackDetailDialog } from "./TrackDetailDialog";
import styles from "./palette-workspace.module.css";
import {
  MIN_SHADE_COUNT,
  type ActiveShade,
  type LightnessPattern,
  type TrackProperty,
} from "./types";
import { ColourFormatProvider } from "./ColourFormatContext";
import { PaletteViewProvider, usePaletteView } from "./PaletteViewContext";

const SEMANTIC_TRACKS: ColorTrackInput[] = [
  { id: "primary", name: "primary", seedHex: "#7646ab" },
  { id: "neutral", name: "neutral", seedHex: "#737373" },
  { id: "success", name: "success", seedHex: "#2f7d32" },
  { id: "warning", name: "warning", seedHex: "#b87503" },
  { id: "error", name: "error", seedHex: "#b02b1b" },
  { id: "info", name: "info", seedHex: "#2878b8" },
];

type ContrastTarget = "white" | "black" | "custom";

type PlaygroundSection =
  "overview" | "shade-generator" | "semantics" | "preview";

type PaletteProject = PaletteProjectData;

function createPatternValues(
  pattern: LightnessPattern,
  shadeCount = BLUEPRINT_20_PRESET.weights.length,
  maxLightness = BLUEPRINT_20_PRESET.lightnessValues[0]!,
  minLightness = BLUEPRINT_20_PRESET.lightnessValues.at(-1)!,
): number[] {
  return defaultLightnessValues(
    pattern,
    shadeCount,
    maxLightness,
    minLightness,
  );
}

/* The workspace name as this tab last saw it. A studio may only write the name
   when it is the one that changed it — another tab may have renamed since, and
   re-reading cannot tell whose name is newer, only that ours is a copy. */
let adoptedName: string | null = null;

/**
 * The palette slice and the workspace name, together.
 *
 * Two values rather than one because the slice no longer carries a name — the
 * workspace owns it. They are read in one call so a studio cannot end up
 * showing a palette from one read and a name from another.
 */
interface StoredPalette {
  name: string;
  palette: PaletteProject | null;
}

function readStoredProject(): StoredPalette {
  try {
    const workspace = loadStoredWorkspace(browserWorkspaceStorage());
    /* Adopt the workspace name: it is one name, and the other studio may
       have set it. */
    adoptedName = workspace?.name ?? null;
    return {
      name: workspace?.name ?? DEFAULT_WORKSPACE_NAME,
      palette: workspace?.palette ?? null,
    };
  } catch {
    return { name: DEFAULT_WORKSPACE_NAME, palette: null };
  }
}

/**
 * Persist the palette half, and only that half.
 *
 * The stored workspace is re-read here rather than reused from state: the
 * typography studio owns the other slice and may have written it since this
 * page loaded. Writing the copy we loaded would take its work with us.
 */
/**
 * Every slice this studio does not own, so an exported file carries them.
 *
 * Read as a group rather than one state per slice. The workspace has grown a
 * slice per stage, and a studio that named each one had to be edited every
 * time — which is how one gets forgotten and an export quietly drops it.
 */
type ForeignSlices = Omit<WorkspaceProject, "name" | "palette" | "semantics">;

function emptyForeignSlices(): ForeignSlices {
  const empty = emptyWorkspace();
  return {
    typography: empty.typography,
    spacing: empty.spacing,
    radius: empty.radius,
    elevation: empty.elevation,
  };
}

function readForeignSlices(): ForeignSlices {
  try {
    const project = loadStoredWorkspace(browserWorkspaceStorage());
    if (!project) return emptyForeignSlices();
    /* Named rather than spread: ForeignSlices is what makes this safe, because
       a slice added to the workspace and forgotten here fails to compile. */
    return {
      typography: project.typography,
      spacing: project.spacing,
      radius: project.radius,
      elevation: project.elevation,
    };
  } catch {
    return emptyForeignSlices();
  }
}

/** The semantic layer, which this studio owns now that it can edit it. */
function readStoredSemantics(): WorkspaceProject["semantics"] {
  try {
    return loadStoredWorkspace(browserWorkspaceStorage())?.semantics ?? null;
  } catch {
    return null;
  }
}

/**
 * Persist the semantic layer, and only that slice.
 *
 * The stored workspace is re-read for the same reason the palette write does
 * it: another tab may have moved on since this page loaded, and writing the
 * copy we hold would take its work with us.
 */
function writeStoredSemantics(semantics: SemanticToken[] | null): void {
  updateStoredWorkspace(browserWorkspaceStorage(), (current) =>
    withSemanticsSlice(current, semantics),
  );
}

/**
 * Replace the whole document.
 *
 * The one place this studio writes the other half, and it is not the rule
 * being broken: an import is the user deliberately replacing everything,
 * rather than one studio persisting a stale copy of a slice it does not own.
 */
function writeImportedWorkspace(imported: WorkspaceProject): void {
  saveStoredWorkspace(browserWorkspaceStorage(), withSharedName(imported));
}

function writeStoredProject(
  project: PaletteProject | null,
  name: string,
): void {
  const next = updateStoredWorkspace(browserWorkspaceStorage(), (current) => {
    const renamedHere = !!project && name !== adoptedName;
    /* withSharedName after the patch, so a name someone else set reaches this
       slice too rather than leaving storage disagreeing with itself. */
    return withSharedName(
      withPaletteSlice(current, project, renamedHere ? name : undefined),
    );
  });
  if (next) adoptedName = next.name;
}
function createDefaultTracks(primarySeed: string): ColorTrackInput[] {
  return SEMANTIC_TRACKS.map((track) =>
    track.id === "primary" ? { ...track, seedHex: primarySeed } : { ...track },
  );
}

/* The glasses mark from the toolbar design. Inline rather than an icon
   import: it is two circles and a bridge, and it belongs to this one chip. */

export function PaletteStudio() {
  return (
    <ColourFormatProvider>
      <PaletteViewProvider>
        <PaletteStudioContent />
      </PaletteViewProvider>
    </ColourFormatProvider>
  );
}

function PaletteStudioContent() {
  const toast = useToast();
  const headerImportInputRef = useRef<HTMLInputElement>(null);
  const [project, setProject] = useState<PaletteProject | null>(null);
  /* The workspace name, which the topbar edits. It used to live on the palette
     slice, which meant renaming the workspace was a palette edit and a studio
     with no palette had nowhere to keep it. */
  const [name, setName] = useState(DEFAULT_WORKSPACE_NAME);
  const [hasLoadedProject, setHasLoadedProject] = useState(false);
  const [activeShade, setActiveShade] = useState<ActiveShade | null>(null);
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  /* View modes live in context so they persist per device, alongside the
     colour format. Neither is part of the project. */
  const { isContrastModeOpen, toggleContrastMode, closeContrastMode } =
    usePaletteView();
  const [contrastTarget, setContrastTarget] = useState<ContrastTarget>("white");
  const [customContrastColour, setCustomContrastColour] = useState("#7646ab");
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  /* Read once on load, so an export carries the type scale without this
     component reading storage while it renders. */
  const [foreign, setForeign] = useState<ForeignSlices>(emptyForeignSlices);
  const [semantics, setSemantics] =
    useState<WorkspaceProject["semantics"]>(null);
  const [hasLoadedSemantics, setHasLoadedSemantics] = useState(false);
  const [pendingImport, setPendingImport] = useState<WorkspaceProject | null>(
    null,
  );
  const [activeSection, setActiveSection] =
    useState<PlaygroundSection>("shade-generator");
  const settingsPanel = useResizable({
    autoSaveId: "blueprint-palette-settings",
    defaultSize: 350,
    minSizePx: 300,
    maxSizePx: 560,
  });

  useEffect(() => {
    /* Reading localStorage must happen in an effect: a useState initializer
       would run during SSR, where window does not exist, and desync
       hydration. */
    const stored = readStoredProject();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProject(stored.palette);
    setName(stored.name);
    setForeign(readForeignSlices());
    setSemantics(readStoredSemantics());
    setHasLoadedSemantics(true);
    setHasLoadedProject(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedProject) return;

    writeStoredProject(project, name);
  }, [hasLoadedProject, project, name]);

  useEffect(() => {
    /* Guarded separately from the palette: writing before the load has run
       would persist a null layer over a stored one. */
    if (!hasLoadedSemantics) return;

    writeStoredSemantics(semantics);
  }, [hasLoadedSemantics, semantics]);

  const weights = useMemo(() => {
    const shadeCount = project?.lightnessValues.length ?? 0;
    if (shadeCount === 0) return [];
    return shadeCount === BLUEPRINT_20_PRESET.weights.length
      ? [...BLUEPRINT_20_PRESET.weights]
      : generateStableWeights(shadeCount);
  }, [project?.lightnessValues.length]);

  const palettes = useMemo(
    () => (project ? generatePalettes(project) : []),
    [project],
  );
  const activeTrack =
    palettes.find((palette) => palette.id === activeTrackId) ?? null;

  const importFromHeader = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      setPendingImport(parseBlueprintWorkspace(await file.text()));
    } catch {
      toast({
        autoHideDuration: 2400,
        body: "Choose a valid Blueprint project file.",
        type: "error",
        uniqueID: "header-project-import-error",
      });
    }
  };

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
        onImport={(imported) => {
          writeImportedWorkspace(imported);
          setForeign(imported);
          setSemantics(imported.semantics);
          setName(imported.name);
          setProject(imported.palette);
        }}
        onCreate={({ name: chosenName, seedHex, method }) => {
          const primarySeed =
            method === "generated" ? "#3b66f5" : normalizeHex(seedHex);
          setName(chosenName);
          setProject({
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
    setName((current) => current.trim() || "Untitled project");
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

  return (
    <main className={styles.workspace}>
      <header className={styles.topbar}>
        <WorkspaceBrand
          name={name}
          onChange={setName}
          onCommit={commitProjectName}
        />
        <nav aria-label="Playground sections" className={styles.navigation}>
          <TabList
            size="sm"
            value={activeSection}
            onChange={(value) => setActiveSection(value as PlaygroundSection)}
          >
            <Tab label="Overview" value="overview" />
            <Tab label="Shade generator" value="shade-generator" />
            <Tab label="Semantics" value="semantics" />
            <Tab label="Preview" value="preview" />
          </TabList>
        </nav>
        <span className={styles.headerActions}>
          <StudioThemeControl />
          <WorkspaceNav active="colour" />
          <input
            ref={headerImportInputRef}
            className={styles.visuallyHidden}
            type="file"
            accept=".json,.blueprint.json,application/json"
            onChange={importFromHeader}
          />
          <Button
            aria-label="Import palette"
            scheme="neutral"
            size="small"
            variant="text"
            onClick={() => headerImportInputRef.current?.click()}
          >
            Import
          </Button>
          <Button
            aria-label="Export palette"
            className={styles.exportButton}
            scheme="neutral"
            size="small"
            variant="outlined"
            onClick={() => setIsExportDialogOpen(true)}
          >
            Export
          </Button>
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
            onClick={toggleContrastMode}
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
        <VisionControl />
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
          projectName={name}
          palettes={palettes}
          lightnessPattern={project.lightnessPattern}
          onSourceColourChange={(id, value) =>
            updateTrack(id, "seedHex", value)
          }
        />
      )}

      {activeSection === "semantics" && (
        <SemanticEditor
          palettes={palettes}
          tokens={semantics ?? []}
          onChange={setSemantics}
        />
      )}

      {activeSection === "preview" && (
        <PalettePreview palettes={palettes} semantics={semantics ?? []} />
      )}

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

      <SystemExportDialog
        isOpen={isExportDialogOpen}
        onImportRequest={setPendingImport}
        workspace={{
          ...foreign,
          name,
          palette: project,
          semantics,
        }}
        onOpenChange={setIsExportDialogOpen}
      />

      <AlertDialog
        actionLabel="Import project"
        description={`This replaces ${name} in this browser with ${pendingImport?.name ?? "the imported project"}. Export the current project first if you want to keep it.`}
        isOpen={pendingImport !== null}
        title="Replace current project?"
        onAction={() => {
          if (!pendingImport) return;
          /* Both halves, before the palette state lands — the persist effect
             below only ever writes its own slice. */
          writeImportedWorkspace(pendingImport);
          setForeign(pendingImport);
          setSemantics(pendingImport.semantics);
          /* The name comes off the workspace now, not out of the palette
             slice it used to ride in on. */
          setName(pendingImport.name);
          setProject(pendingImport.palette);
          setPendingImport(null);
          setActiveShade(null);
          setActiveTrackId(null);
          closeContrastMode();
        }}
        onOpenChange={(isOpen) => {
          if (!isOpen) setPendingImport(null);
        }}
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
          closeContrastMode();
        }}
        onOpenChange={setIsNewProjectDialogOpen}
      />
    </main>
  );
}
