"use client";

import { useState, type CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { Tab, TabList } from "@astryxdesign/core/TabList";
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
  seedTypographyProject,
  useWorkspaceStore,
} from "@blueprint/ui";
import { Sheet } from "../Sheet";
import { SystemExportDialog } from "../SystemExportDialog";
import { useUndoShortcut } from "../use-undo-shortcut";
import { useUrlState } from "../use-url-state";
import { useIsPhone } from "../use-is-phone";
import { LayoutUsesTable } from "./LayoutUsesTable";
import { ScaleCanvas } from "./ScaleCanvas";
import { ScaleInspector } from "./ScaleInspector";
import {
  ScaleSettingsResizeHandle,
  useScaleSettingsPanel,
} from "./ScaleSettingsPanel";
import { ScaleToolbar } from "./ScaleToolbar";
import { RadiusPreviewTab } from "./RadiusPreviewTab";
import { SCALE_SECTION_LABEL, scaleSectionFromPath } from "./scale-section";
import { useScaleHistory } from "./use-scale-history";
import { useSelectedLevel } from "./use-selected-level";
import { useSpacingView } from "./use-spacing-view";
import styles from "./scale-workspace.module.css";

type StudioView = "scale" | "uses" | "preview";

/* The views a section has, the first being where it opens: spacing has no
   preview, and elevation has neither Uses nor Preview. */
const VIEWS_BY_SECTION: Record<string, readonly StudioView[]> = {
  spacing: ["scale", "uses"],
  radius: ["scale", "uses", "preview"],
  elevation: ["scale"],
};

export function ScaleStudio() {
  const pathname = usePathname();
  const activeSection = scaleSectionFromPath(pathname);
  const store = useWorkspaceStore();
  const history = useScaleHistory(store);
  const [detachedBaseUnit, setDetachedBaseUnit] = useState<number | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  /* On a phone the settings are a sheet, opened from the toolbar, and the
     canvas has the whole screen. As in the Typography studio. */
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const isPhone = useIsPhone();
  /* In the URL, so Back and Forward move between views, a refresh keeps the
     view, and the sidebar returns to it. Each section is its own route, so a
     view never leaks into another: it is read against the section's own. */
  const [studioView, setStudioView] = useUrlState<StudioView>(
    "view",
    VIEWS_BY_SECTION[activeSection] ?? ["scale"],
    "scale",
  );
  const settingsPanel = useScaleSettingsPanel();

  const project = store.project;
  const spacing = project?.spacing ?? defaultSpacingScale();
  const radius = project?.radius ?? defaultRadiusScale();
  const elevation = project?.elevation ?? defaultElevationScale();
  /* The level the Elevation inspector edits, the first when it is gone. */
  const [selectedElevationId, setSelectedElevationId] = useSelectedLevel(
    elevation.levels,
    "low",
  );
  const layout = project?.layout ?? defaultLayoutTokens();
  const typography =
    project?.typography ?? seedTypographyProject(project?.name ?? "Workspace");
  const previewDevices = project?.previewDevices ?? defaultPreviewDevices();
  const palettes = project?.palette ? generatePalettes(project.palette) : [];
  /* The preview's settings and active slot, shared by canvas and list. */
  const spacingView = useSpacingView(store);
  const showUses =
    studioView === "uses" &&
    (activeSection === "spacing" || activeSection === "radius");
  /* Radius only: spacing has no one piece of UI that proves its uses. */
  const showPreview = studioView === "preview" && activeSection === "radius";
  /* Either takes the whole width, with no settings panel beside it. */
  const isFullWidth = showUses || showPreview;

  /* Ctrl or Cmd+Z undoes, with Shift redoes, wherever focus is. */
  useUndoShortcut(history.undo, history.redo);

  const sectionLabel = `${SCALE_SECTION_LABEL[activeSection]} settings`;

  const inspectorContent = (
    <ScaleInspector
      detachedBaseUnit={detachedBaseUnit}
      elevation={elevation}
      layout={layout}
      palettes={palettes}
      radius={radius}
      section={activeSection}
      selectedElevationId={selectedElevationId}
      spacing={spacing}
      spacingView={spacingView}
      write={history.write}
      onDetachedBaseUnitChange={setDetachedBaseUnit}
      onSelectElevation={setSelectedElevationId}
    />
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
    <div className={styles.workspace}>
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

      <ScaleToolbar
        history={history}
        settingsLabel={isFullWidth ? undefined : sectionLabel}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

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
            typography={typography}
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
            <ScaleCanvas
              elevation={elevation}
              palettes={palettes}
              radius={radius}
              section={activeSection}
              selectedElevationId={selectedElevationId}
              spacing={spacing}
              spacingView={spacingView}
              write={history.write}
              onSelectElevation={setSelectedElevationId}
            />

            <ScaleSettingsResizeHandle panel={settingsPanel} />

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
