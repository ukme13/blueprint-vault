"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { ResizeHandle, useResizable } from "@astryxdesign/core/Resizable";
import {
  assessTypeSystem,
  generatePalettes,
  generateTypeSteps,
  findGoogleFont,
  openRoleGroupIds,
  openTypeScaleWarnings,
  previewFontFor,
  previewWeightFor,
  roleStyleOnDevice,
  rolesInGroupOrder,
  TYPE_SCALE_RATIO_PRESETS,
  hybridPresetsFromModularScale,
  type TypeRole,
  defaultPreviewDevices,
  resolvePreviewDevice,
  useWorkspaceStore,
  withSeededTypographySlice,
  workspaceHasStudios,
  type ShadeRef,
} from "@blueprint/ui";
import { Sheet } from "../Sheet";
import { StudioSliceEmpty } from "../shell/StudioSliceEmpty";
import { useIsPhone } from "../use-is-phone";
import { TypographyExportDialog } from "./TypographyExportDialog";
import {
  INSPECTOR_TABS,
  TypographyInspector,
  type InspectorTab,
} from "./TypographyInspector";
import { useUrlState } from "../use-url-state";
import { TypographyPreview } from "./TypographyPreview";
import { TypographyTopbar } from "./TypographyTopbar";
import { TypeStepCanvas } from "./TypeStepCanvas";
import { useGoogleFontsLink } from "./use-google-fonts";
import { useLocalFonts } from "./use-local-fonts";
import { useDeviceRatios } from "./use-device-ratios";
import { useTypographyProject } from "./use-typography-project";
import { useTypographySystem } from "./use-typography-system";
import styles from "./typography-workspace.module.css";
import {
  storedTemplateForSection,
  TYPOGRAPHY_SECTIONS,
  type TypographySection,
} from "./types";

const SCALE_RATIO_PRESETS = hybridPresetsFromModularScale(
  TYPE_SCALE_RATIO_PRESETS,
);

export function TypographyStudio() {
  const workspace = useWorkspaceStore();
  const {
    project,
    setProject,
    palette,
    hasLoaded: hasLoadedProject,
    patchProject,
    setPreference,
    reload,
  } = useTypographyProject();
  /* The view and the inspector's tab live in the URL: Back and Forward move
     between them, a refresh keeps them, and the sidebar returns to them. */
  const [activeSection, setActiveSection] = useUrlState<TypographySection>(
    "view",
    TYPOGRAPHY_SECTIONS,
    "editor",
  );
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  /* The active device is a way of looking at the project, not part of it.
     Which devices are offered is a setting and persists. */
  const [previewDevice, setPreviewDevice] = useState("desktop");
  /* Which font entry the step list renders in. The steps are sizes shared by
     several roles, so they have no font of their own to follow. */
  const [previewFontId, setPreviewFontId] = useState<string | null>(null);
  /* Preview colours are a way of looking at the scale, so the chosen pair
     is view state. */
  const [textShade, setTextShade] = useState<ShadeRef | null>(null);
  const [backgroundShade, setBackgroundShade] = useState<ShadeRef | null>(null);
  const [previewWeight, setPreviewWeight] = useState<number | null>(null);
  const inspectorPanel = useResizable({
    autoSaveId: "blueprint-typography-inspector",
    defaultSize: 560,
    minSizePx: 360,
    maxSizePx: 900,
  });

  const system = project?.system ?? null;
  const previewDevices =
    workspace.project?.previewDevices ??
    defaultPreviewDevices(system?.ratio ?? 1.25);
  const activePreviewDevice = project
    ? resolvePreviewDevice(previewDevice, previewDevices)
    : undefined;

  /* Steps still come from the base and the active device's ratio; roles
     linked to a step follow them, roles with step: null keep the size
     someone set by hand. Switching a nav icon changes the ramp, not only
     the preview frame. */
  const steps = useMemo(() => {
    if (!system) return [];
    return generateTypeSteps(
      system.baseFontSizePx,
      activePreviewDevice?.ratio ?? system.ratio,
      system.stepCount,
    );
  }, [system, activePreviewDevice?.ratio]);

  const desktopSteps = useMemo(() => {
    if (!system) return [];
    return generateTypeSteps(
      system.baseFontSizePx,
      system.ratio,
      system.stepCount,
    );
  }, [system]);

  const paletteTracks = useMemo(
    () => (palette ? generatePalettes(palette) : []),
    [palette],
  );

  const actions = useTypographySystem(setProject);

  const [inspectorTab, setInspectorTab] = useUrlState<InspectorTab>(
    "tab",
    INSPECTOR_TABS,
    "settings",
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  /* On a phone the groups are an accordion. Null until somebody opens or
     closes one, so the first group is open by default. */
  const [storedOpenGroups, setStoredOpenGroups] = useState<string[] | null>(
    null,
  );
  const isPhone = useIsPhone();

  const deviceRatios = useDeviceRatios(patchProject);

  const previewFont = system
    ? previewFontFor(system, previewFontId)
    : undefined;
  /* Only the weights this family actually ships. More than half the
     catalogue ships exactly one, so a fixed 100-900 control would offer eight
     weights the browser could only fake. */
  const previewWeights =
    findGoogleFont(previewFont?.families[0] ?? "")?.weights ?? [];
  const resolvedPreviewWeight = previewWeightFor(previewWeights, previewWeight);

  useGoogleFontsLink(system, previewFont, resolvedPreviewWeight);
  /* Bumped after every upload, so re-adding a file that keeps its name still
     makes the hook look again. */
  const [fontFileRevision, setFontFileRevision] = useState(0);
  const localFontStatus = useLocalFonts(system, fontFileRevision);

  const frameId = activePreviewDevice?.id ?? "desktop";
  /* What the badges count and the Warnings tab lists: the checks worth
     acting on. */
  const warnings = system
    ? openTypeScaleWarnings(
        assessTypeSystem(system, steps, frameId, project?.specimenText ?? ""),
      )
    : [];

  /* The project stores the template its view shows, so the export follows it.
     Here, not in the tab's handler: Back, Forward and a link change the view
     without a click. */
  const viewTemplate = storedTemplateForSection(activeSection);
  const storedTemplate = project?.template;
  useEffect(() => {
    if (viewTemplate && storedTemplate && viewTemplate !== storedTemplate) {
      setPreference({ template: viewTemplate });
    }
    // setPreference is a fresh closure each render; the two values decide.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewTemplate, storedTemplate]);

  if (!hasLoadedProject) {
    return (
      <div
        aria-busy="true"
        aria-live="polite"
        className={styles.loadingPage}
        role="status"
      >
        Loading type scale…
      </div>
    );
  }

  if (!project || !system || !activePreviewDevice) {
    return (
      <StudioSliceEmpty
        slice="Typography"
        onSeed={() => {
          const current = workspace.project;
          if (!current || !workspaceHasStudios(current)) return;
          workspace.save(withSeededTypographySlice(current));
          reload();
        }}
      />
    );
  }

  const sortedSteps = [...steps].sort(
    (first, second) => second.fontSizePx - first.fontSizePx,
  );
  /* The specimen reads in the order of the Groups panel beside it. */
  const specimenRoles = rolesInGroupOrder(system);
  const devices = previewDevices;
  const activeDevice = activePreviewDevice;
  const styleOfRole = (role: TypeRole) =>
    roleStyleOnDevice(
      system,
      steps,
      desktopSteps,
      role,
      activeDevice.id,
    ) as CSSProperties;

  const inspectorContent = (
    <TypographyInspector
      actions={actions}
      devices={{
        ...deviceRatios,
        devices,
        presets: SCALE_RATIO_PRESETS,
      }}
      fonts={{
        fileStatus: localFontStatus,
        onFilesChange: () => setFontFileRevision((current) => current + 1),
      }}
      groups={{
        deviceId: activeDevice.id,
        isPhone,
        openGroups: openRoleGroupIds(storedOpenGroups, system.groups),
        steps: sortedSteps,
        onOpenGroupsChange: setStoredOpenGroups,
      }}
      system={system}
      tab={inspectorTab}
      warnings={warnings}
      onTabChange={setInspectorTab}
    />
  );

  return (
    <div className={styles.workspace}>
      <TypographyTopbar
        deviceBar={{
          activeId: activeDevice.id,
          devices,
          onChange: setPreviewDevice,
        }}
        section={activeSection}
        warningCount={warnings.length}
        onExport={() => setIsExportDialogOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onSectionChange={setActiveSection}
      />

      <section
        className={styles.editor}
        style={
          {
            "--inspector-width": `${inspectorPanel.size}px`,
          } as CSSProperties
        }
      >
        {activeSection === "editor" ? (
          <TypeStepCanvas
            deviceId={activeDevice.id}
            preferences={project}
            previewFont={previewFont}
            previewWeight={resolvedPreviewWeight}
            previewWeights={previewWeights}
            steps={sortedSteps}
            system={system}
            onPreferencesChange={setPreference}
            onPreviewFontChange={setPreviewFontId}
            onPreviewWeightChange={setPreviewWeight}
          />
        ) : (
          <TypographyPreview
            device={activeDevice}
            roles={specimenRoles}
            specimenText={project.specimenText}
            onSpecimenTextChange={(specimenText) =>
              setPreference({ specimenText })
            }
            previewDocument={project.previewDocument}
            onPreviewDocumentChange={(previewDocument) =>
              setPreference({ previewDocument })
            }
            styleOf={styleOfRole}
            system={system}
            view={activeSection === "preview" ? "preview" : "specimen"}
            unit={project.unit}
            remRootPx={project.remRootPx}
            backgroundShade={backgroundShade}
            textShade={textShade}
            tracks={paletteTracks}
            onBackgroundShadeChange={setBackgroundShade}
            onTextShadeChange={setTextShade}
          />
        )}

        <ResizeHandle
          className={styles.resizeHandle}
          direction="horizontal"
          hasDivider
          isReversed
          label="Resize typography settings"
          pillPlacement="center"
          resizable={inspectorPanel.props}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              inspectorPanel.resize(inspectorPanel.size + 10);
            }
            if (event.key === "ArrowRight") {
              event.preventDefault();
              inspectorPanel.resize(inspectorPanel.size - 10);
            }
          }}
        />

        {/* On a phone the settings are in a sheet, below, and the specimens
            get the whole height. Hidden by CSS as well as left out here, since
            the first render cannot know the width yet. */}
        {!isPhone && (
          <section
            aria-label="Type scale settings"
            className={styles.inspector}
          >
            {inspectorContent}
          </section>
        )}
      </section>

      {isPhone && (
        <Sheet
          height="capped"
          isOpen={isSettingsOpen}
          label="Type scale settings"
          padding="flush"
          onClose={() => setIsSettingsOpen(false)}
        >
          <section
            aria-label="Type scale settings"
            className={styles.inspector}
          >
            {inspectorContent}
          </section>
        </Sheet>
      )}

      <TypographyExportDialog
        isOpen={isExportDialogOpen}
        projectName={workspace.project?.name ?? system.name}
        system={system}
        unit={project.unit}
        remRootPx={project.remRootPx}
        devices={previewDevices}
        onOpenChange={setIsExportDialogOpen}
        onUnitChange={(unit) => setPreference({ unit })}
        onRemRootChange={(remRootPx) => setPreference({ remRootPx })}
      />
    </div>
  );
}
