"use client";

import {
  useEffect,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { IconButton } from "@astryxdesign/core/IconButton";
import { ResizeHandle, useResizable } from "@astryxdesign/core/Resizable";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { Redo2, Undo2 } from "lucide-react";
import {
  Button,
  DEFAULT_WORKSPACE_NAME,
  defaultElevationScale,
  defaultRadiusScale,
  defaultSpacingScale,
  emptyWorkspace,
  generatePalettes,
  resolveSpacing,
  useWorkspaceStore,
  withSharedName,
  type HybridTokenizedValue,
} from "@blueprint/ui";
import { SystemExportDialog } from "../SystemExportDialog";
import { WorkspaceBrand } from "../WorkspaceBrand";
import { ElevationCanvas } from "./ElevationEditor";
import { ElevationInspector } from "./ElevationInspector";
import { RadiusCanvas, RadiusInspector } from "./RadiusEditor";
import { ScalePreviewCanvas } from "./ScalePreview";
import { ScalePreviewInspector } from "./ScalePreviewInspector";
import { SpacingCanvas, SpacingInspector } from "./SpacingEditor";
import { useScaleHistory } from "./use-scale-history";
import styles from "./scale-workspace.module.css";

type ScaleSection = "spacing" | "radius" | "elevation" | "preview";

export function ScaleStudio() {
  const store = useWorkspaceStore();
  const history = useScaleHistory(store);
  const [name, setName] = useState(DEFAULT_WORKSPACE_NAME);
  const [nameReady, setNameReady] = useState(false);
  const [detachedBaseUnit, setDetachedBaseUnit] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState<ScaleSection>("spacing");
  const [isExportOpen, setIsExportOpen] = useState(false);
  const settingsPanel = useResizable({
    autoSaveId: "blueprint-scale-settings",
    defaultSize: 350,
    minSizePx: 300,
    maxSizePx: 560,
  });

  const project = store.project;
  const spacing = project?.spacing ?? defaultSpacingScale();
  const radius = project?.radius ?? defaultRadiusScale();
  const elevation = project?.elevation ?? defaultElevationScale();
  const palettes = project?.palette ? generatePalettes(project.palette) : [];
  const tokens = resolveSpacing(spacing);

  useEffect(() => {
    /* Adopt the workspace name once the store has read. The field is not on
       the scale snapshot: another studio may have renamed, and this page
       should show that name rather than invent one. */
    if (!store.hasLoaded || nameReady) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(project?.name ?? DEFAULT_WORKSPACE_NAME);
    setNameReady(true);
  }, [store.hasLoaded, nameReady, project?.name]);

  const commitName = () => {
    const next = name.trim() || DEFAULT_WORKSPACE_NAME;
    setName(next);
    store.update((current) =>
      withSharedName({ ...(current ?? emptyWorkspace()), name: next }),
    );
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("input, textarea, [role='combobox']")) return;
    if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "z") {
      return;
    }
    event.preventDefault();
    if (event.shiftKey) history.redo();
    else history.undo();
  };

  const spacingInspector = (
    <SpacingInspector
      detachedBaseUnit={detachedBaseUnit}
      scale={spacing}
      onBaseUnitChange={(next: HybridTokenizedValue) => {
        setDetachedBaseUnit(next.isPreset ? null : next.value);
        history.write(
          { spacing: { ...spacing, baseUnitPx: next.value } },
          { editKey: "spacing:base" },
        );
      }}
      onDensityChange={(density) =>
        history.write(
          { spacing: { ...spacing, density } },
          { editKey: "spacing:density" },
        )
      }
      onToggleStep={(step) => {
        const kept = new Set(spacing.steps);
        history.write({
          spacing: {
            ...spacing,
            steps: kept.has(step)
              ? spacing.steps.filter((each) => each !== step)
              : [...spacing.steps, step].sort((a, b) => a - b),
          },
        });
      }}
    />
  );

  const radiusInspector = (
    <RadiusInspector
      scale={radius}
      onChange={(next, editKey) => history.write({ radius: next }, { editKey })}
    />
  );

  if (!store.hasLoaded || !nameReady) {
    return (
      <div
        aria-busy="true"
        aria-live="polite"
        className={styles.loadingPage}
        role="status"
      >
        Loading workspace…
      </div>
    );
  }

  return (
    <div className={styles.workspace} onKeyDown={onKeyDown}>
      <header className={styles.topbar}>
        <WorkspaceBrand name={name} onChange={setName} onCommit={commitName} />
        <nav aria-label="Scale views" className={styles.navigation}>
          <TabList
            size="sm"
            value={activeSection}
            onChange={(value) => setActiveSection(value as ScaleSection)}
          >
            <Tab label="Spacing" value="spacing" />
            <Tab label="Radius" value="radius" />
            <Tab label="Elevation" value="elevation" />
            <Tab label="Preview" value="preview" />
          </TabList>
        </nav>
        <span className={styles.headerActions}>
          <Button
            scheme="neutral"
            size="small"
            variant="outlined"
            onClick={() => setIsExportOpen(true)}
          >
            Export
          </Button>
        </span>
      </header>

      <section aria-label="Scale toolbar" className={styles.toolbar}>
        <span className={styles.historyButtons}>
          <IconButton
            isDisabled={!history.canUndo}
            icon={<Undo2 aria-hidden className="size-3.5" />}
            label="Undo"
            tooltip="Undo"
            size="sm"
            variant="ghost"
            onClick={history.undo}
          />
          <IconButton
            isDisabled={!history.canRedo}
            icon={<Redo2 aria-hidden className="size-3.5" />}
            label="Redo"
            tooltip="Redo"
            size="sm"
            variant="ghost"
            onClick={history.redo}
          />
        </span>
      </section>

      <section
        className={styles.editor}
        style={
          {
            "--inspector-width": `${settingsPanel.size}px`,
          } as CSSProperties
        }
      >
        <section
          aria-label={
            activeSection === "spacing"
              ? "Spacing canvas"
              : activeSection === "radius"
                ? "Radius canvas"
                : activeSection === "elevation"
                  ? "Elevation canvas"
                  : "Preview canvas"
          }
          className={styles.canvas}
        >
          {activeSection === "spacing" && <SpacingCanvas tokens={tokens} />}
          {activeSection === "radius" && (
            <RadiusCanvas
              scale={radius}
              onChange={(next, editKey) =>
                history.write({ radius: next }, { editKey })
              }
            />
          )}
          {activeSection === "elevation" && (
            <ElevationCanvas palettes={palettes} scale={elevation} />
          )}
          {activeSection === "preview" && (
            <ScalePreviewCanvas
              elevation={elevation}
              palettes={palettes}
              radius={radius}
              semantics={project?.semantics ?? []}
              spacing={spacing}
            />
          )}
        </section>

        <ResizeHandle
          className={styles.resizeHandle}
          direction="horizontal"
          hasDivider
          isReversed
          label="Resize scale settings"
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

        <aside className={styles.inspector}>
          <div className={styles.inspectorHeader}>
            {activeSection === "spacing" && "Spacing settings"}
            {activeSection === "radius" && "Radius settings"}
            {activeSection === "elevation" && "Elevation settings"}
            {activeSection === "preview" && "Layout jobs"}
          </div>
          {activeSection === "spacing" && spacingInspector}
          {activeSection === "radius" && radiusInspector}
          {activeSection === "elevation" && (
            <ElevationInspector
              palettes={palettes}
              scale={elevation}
              onChange={(next, editKey) =>
                history.write({ elevation: next }, { editKey })
              }
            />
          )}
          {activeSection === "preview" && (
            <ScalePreviewInspector
              elevation={elevation}
              radius={radius}
              spacing={spacing}
            >
              {spacingInspector}
              {radiusInspector}
            </ScalePreviewInspector>
          )}
        </aside>
      </section>

      <SystemExportDialog
        isOpen={isExportOpen}
        workspace={{
          ...(project ?? emptyWorkspace(name)),
          name,
          spacing,
          radius,
          elevation,
        }}
        onOpenChange={setIsExportOpen}
      />
    </div>
  );
}
