"use client";

import { useState, type CSSProperties, type KeyboardEvent } from "react";
import { usePathname } from "next/navigation";
import { IconButton } from "@astryxdesign/core/IconButton";
import { ResizeHandle, useResizable } from "@astryxdesign/core/Resizable";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { Redo2, SlidersHorizontal, Undo2 } from "lucide-react";
import {
  Button,
  DEFAULT_WORKSPACE_NAME,
  defaultElevationScale,
  defaultLayoutTokens,
  defaultPreviewDevices,
  defaultRadiusScale,
  defaultSpacingScale,
  emptyWorkspace,
  generatePalettes,
  resolveSpacing,
  useWorkspaceStore,
  type HybridTokenizedValue,
} from "@blueprint/ui";
import { Sheet } from "../Sheet";
import { SystemExportDialog } from "../SystemExportDialog";
import { useIsPhone } from "../use-is-phone";
import { ElevationCanvas } from "./ElevationEditor";
import { ElevationInspector } from "./ElevationInspector";
import { LayoutUsesTable } from "./LayoutUsesTable";
import { RadiusPreviewTab } from "./RadiusPreviewTab";
import { RadiusCanvas, RadiusInspector } from "./RadiusEditor";
import { SpacingCanvas, SpacingInspector } from "./SpacingEditor";
import { useScaleHistory } from "./use-scale-history";
import styles from "./scale-workspace.module.css";

type ScaleSection = "spacing" | "radius" | "elevation";
type StudioView = "scale" | "uses" | "preview";

function sectionFromPath(pathname: string): ScaleSection {
  if (pathname === "/radius" || pathname.startsWith("/radius/")) {
    return "radius";
  }
  if (pathname === "/elevation" || pathname.startsWith("/elevation/")) {
    return "elevation";
  }
  return "spacing";
}

export function ScaleStudio() {
  const pathname = usePathname();
  const activeSection = sectionFromPath(pathname);
  const store = useWorkspaceStore();
  const history = useScaleHistory(store);
  const [detachedBaseUnit, setDetachedBaseUnit] = useState<number | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  /* On a phone the settings are a sheet, opened from the toolbar, and the
     canvas has the whole screen. As in the Typography studio. */
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const isPhone = useIsPhone();
  const [studioView, setStudioView] = useState<StudioView>("scale");
  const [viewSection, setViewSection] = useState(activeSection);
  if (viewSection !== activeSection) {
    setViewSection(activeSection);
    setStudioView("scale");
  }
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
  const layout = project?.layout ?? defaultLayoutTokens();
  const previewDevices = project?.previewDevices ?? defaultPreviewDevices();
  const palettes = project?.palette ? generatePalettes(project.palette) : [];
  const tokens = resolveSpacing(spacing);
  const showUses =
    studioView === "uses" &&
    (activeSection === "spacing" || activeSection === "radius");
  /* Radius only: spacing has no one piece of UI that proves its uses. */
  const showPreview = studioView === "preview" && activeSection === "radius";
  /* Either takes the whole width, with no settings panel beside it. */
  const isFullWidth = showUses || showPreview;

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

  const sectionLabel =
    activeSection === "spacing"
      ? "Spacing settings"
      : activeSection === "radius"
        ? "Radius settings"
        : "Elevation settings";

  /* One element, rendered beside the canvas on a wide screen and in a bottom
     sheet on a phone, so the two can never offer different controls. */
  const inspectorContent = (
    <>
      <div className={styles.inspectorHeader}>{sectionLabel}</div>
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
    </>
  );

  if (!store.hasLoaded) {
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
        {(activeSection === "spacing" || activeSection === "radius") && (
          <nav aria-label="Scale sections" className={styles.navigation}>
            <TabList
              size="sm"
              value={studioView}
              onChange={(value) => setStudioView(value as StudioView)}
            >
              <Tab label="Scale" value="scale" />
              <Tab label="Uses" value="uses" />
              {activeSection === "radius" && (
                <Tab label="Preview" value="preview" />
              )}
            </TabList>
          </nav>
        )}
        <span className={styles.headerActions}>
          <Button
            scheme="neutral"
            size="medium"
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
        {/* A phone's way to the settings; CSS shows it only there. None in
            the Uses view, which has no settings panel. */}
        {!isFullWidth && (
          <span className={styles.settingsTrigger}>
            <IconButton
              icon={<SlidersHorizontal aria-hidden className="size-4" />}
              label={sectionLabel}
              size="md"
              variant="secondary"
              onClick={() => setIsSettingsOpen(true)}
            />
          </span>
        )}
      </section>

      <section
        className={isFullWidth ? styles.usesEditor : styles.editor}
        style={
          isFullWidth
            ? undefined
            : ({
                "--inspector-width": `${settingsPanel.size}px`,
              } as CSSProperties)
        }
      >
        {showPreview ? (
          <RadiusPreviewTab
            devices={previewDevices}
            layout={layout}
            palettes={palettes}
            radius={radius}
            semantics={project?.semantics ?? []}
          />
        ) : showUses ? (
          <LayoutUsesTable
            devices={previewDevices}
            kind={activeSection === "radius" ? "radius" : "spacing"}
            radius={radius}
            spacing={spacing}
            tokens={layout}
            onChange={(next) => history.write({ layout: next })}
          />
        ) : (
          <>
            <section
              aria-label={
                activeSection === "spacing"
                  ? "Spacing canvas"
                  : activeSection === "radius"
                    ? "Radius canvas"
                    : "Elevation canvas"
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

            {/* In a sheet on a phone. Hidden by CSS as well as left out here,
                since the first render cannot know the width yet. */}
            {!isPhone && (
              <aside className={styles.inspector}>{inspectorContent}</aside>
            )}
          </>
        )}
      </section>

      {isPhone && !isFullWidth && (
        <Sheet
          isOpen={isSettingsOpen}
          label={sectionLabel}
          padding="flush"
          onClose={() => setIsSettingsOpen(false)}
        >
          <aside className={styles.inspector}>{inspectorContent}</aside>
        </Sheet>
      )}

      <SystemExportDialog
        isOpen={isExportOpen}
        workspace={{
          ...(project ?? emptyWorkspace()),
          name: project?.name ?? DEFAULT_WORKSPACE_NAME,
          spacing,
          radius,
          elevation,
        }}
        onOpenChange={setIsExportOpen}
      />
    </div>
  );
}
