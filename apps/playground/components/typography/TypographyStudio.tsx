"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { ResizeHandle, useResizable } from "@astryxdesign/core/Resizable";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import { Selector } from "@astryxdesign/core/Selector";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import {
  assessBodyFontSize,
  assessLineHeight,
  assessRoleWeights,
  assessScaleGrowth,
  assessStepCount,
  Button,
  generatePalettes,
  generateTypeSteps,
  MAX_BASE_FONT_SIZE_PX,
  MAX_STEP_COUNT,
  MIN_BASE_FONT_SIZE_PX,
  MIN_STEP_COUNT,
  familiesToCss,
  findGoogleFont,
  fontFamilyValue,
  formatLength,
  defaultSystem,
  splitFontFamily,
  canAddRole,
  isRoleUnlinkedOnDevice,
  pruneUnlinkedSizes,
  resolveRoleSizePx,
  TYPE_SCALE_UNITS,
  TYPE_SCALE_RATIO_PRESETS,
  hybridPresetsFromModularScale,
  type PaletteProjectData,
  type TypeRole,
  type TypeScaleUnit,
  resolveLineHeight,
  fallbackFileMoves,
  isLocalSlot,
  localFontKey,
  resolveTemplateSlot,
  type SemanticRole,
  defaultPreviewDevices,
  addExtraDesktop,
  removePreviewDevice,
  updatePreviewDevice,
  resolvePreviewDevice,
  type HybridTokenizedValue,
  type LineHeightConfig,
} from "@blueprint/ui";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Badge } from "@astryxdesign/core/Badge";
import { TypographyCreation } from "./TypographyCreation";
import { TypographyExportDialog } from "./TypographyExportDialog";
import { WorkspaceBrand } from "../WorkspaceBrand";
import { ThemeControl } from "../ThemeControl";
import { WorkspaceNav } from "../WorkspaceNav";
import { FontStackEditor } from "./FontStackEditor";
import { RoleGroupEditor } from "./RoleGroupEditor";
import { TypographyPreview } from "./TypographyPreview";
import { PreviewDeviceBar } from "./PreviewDeviceBar";
import { PreviewDeviceSettings } from "./PreviewDeviceSettings";
import type { ShadeRef } from "./PreviewColourControls";
import {
  DEFAULT_SPECIMEN_TEXT,
  DEFAULT_TEMPLATE,
  DEFAULT_UNIT,
  readStoredPalette,
  readStoredProject,
  writeStoredProject,
  type TypographyProject,
} from "./typography-project";
import { useGoogleFontsLink } from "./use-google-fonts";
import {
  forgetFontEntry,
  forgetFontSlot,
  moveLocalFont,
  forgetLocalFonts,
  storeLocalFont,
  useLocalFonts,
} from "./use-local-fonts";
import { useTypographySystem } from "./use-typography-system";
import styles from "./typography-workspace.module.css";
import type { TypographySection } from "./types";

const SCALE_RATIO_PRESETS = hybridPresetsFromModularScale(
  TYPE_SCALE_RATIO_PRESETS,
);

export function TypographyStudio() {
  const [project, setProject] = useState<TypographyProject | null>(null);
  const [hasLoadedProject, setHasLoadedProject] = useState(false);
  const [activeSection, setActiveSection] =
    useState<TypographySection>("editor");
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false);
  /* The active device is a way of looking at the project, not part of it.
     Which devices are offered is a setting and persists. */
  const [previewDevice, setPreviewDevice] = useState("desktop");
  /* Which font entry the step list renders in. The steps are sizes shared by
     several roles, so they have no font of their own to follow. */
  const [previewFontId, setPreviewFontId] = useState<string | null>(null);
  /* The palette half of the same workspace, read once on load. Preview colours
     are a way of looking at the scale, so the chosen pair is view state. */
  const [palette, setPalette] = useState<PaletteProjectData | null>(null);
  const [textShade, setTextShade] = useState<ShadeRef | null>(null);
  const [backgroundShade, setBackgroundShade] = useState<ShadeRef | null>(null);
  const [previewWeight, setPreviewWeight] = useState<number | null>(null);
  const [detachedRatios, setDetachedRatios] = useState<
    Record<string, number | null>
  >({});
  const inspectorPanel = useResizable({
    autoSaveId: "blueprint-typography-inspector",
    defaultSize: 560,
    minSizePx: 360,
    maxSizePx: 900,
  });

  useEffect(() => {
    /* Reading localStorage must happen in an effect: a useState initializer
       would run during SSR, where window does not exist, and desync
       hydration. */
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProject(readStoredProject());
    setPalette(readStoredPalette());
    setHasLoadedProject(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedProject) return;

    writeStoredProject(project);
  }, [hasLoadedProject, project]);

  const system = project?.system ?? null;
  const activePreviewDevice = project
    ? resolvePreviewDevice(previewDevice, project.previewDevices)
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

  const paletteTracks = useMemo(
    () => (palette ? generatePalettes(palette) : []),
    [palette],
  );

  const {
    addFont,
    addGroup,
    addRole,
    bindLineHeight,
    bindRoleStep,
    removeFont,
    removeFontSlot,
    removeGroup,
    removeRole,
    renameFont,
    renameGroupById,
    setGoogleFont,
    setLocalFont,
    reorderGroups,
    unlinkLineHeight,
    unlinkRoleSize,
    updateGroup,
    updateRole,
    updateRoleValue,
    updateSystem,
  } = useTypographySystem(setProject);

  /* Which panel the inspector is showing.

     Three, because the inspector had grown into one column holding the scale,
     every font, every group and the warnings — a scroll long enough that
     changing the ratio meant losing sight of what it changed. */
  const [inspectorTab, setInspectorTab] = useState<
    "settings" | "groups" | "warnings"
  >("settings");

  /* A drag has to start past a few pixels, or every click on a handle is a
     zero-length drag and the button never reports a press. The keyboard
     sensor is what replaces the up and down buttons. */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  /* Unit, specimen and template sit beside the system rather than in it, so
     they do not go through the hook. This is the same guard it keeps, once. */
  const patchProject = (
    updater: (current: TypographyProject) => TypographyProject,
  ) => {
    setProject((current) => (current ? updater(current) : current));
  };

  const setPreference = (patch: Partial<Omit<TypographyProject, "system">>) =>
    patchProject((current) => ({ ...current, ...patch }));

  const handleAddDesktop = () => {
    patchProject((current) => ({
      ...current,
      previewDevices: addExtraDesktop(current.previewDevices),
    }));
  };

  const handleRemoveDevice = (id: string) => {
    patchProject((current) => {
      const previewDevices = removePreviewDevice(current.previewDevices, id);
      return {
        ...current,
        previewDevices,
        system: pruneUnlinkedSizes(
          current.system,
          previewDevices.map((device) => device.id),
        ),
      };
    });
  };

  const handleDeviceWidth = (id: string, widthPx: number) => {
    patchProject((current) => ({
      ...current,
      previewDevices: updatePreviewDevice(current.previewDevices, id, {
        widthPx,
      }),
    }));
  };

  const handleDeviceRatio = (id: string, next: HybridTokenizedValue) => {
    setDetachedRatios((current) => ({
      ...current,
      [id]: next.isPreset ? null : next.value,
    }));
    patchProject((current) => ({
      ...current,
      previewDevices: updatePreviewDevice(current.previewDevices, id, {
        ratio: next.value,
      }),
      system:
        id === "desktop"
          ? { ...current.system, ratio: next.value }
          : current.system,
    }));
  };

  /* Defaults to whatever body uses, since that is the size people read most,
     and falls through if the chosen entry has since been removed. */
  const previewFont =
    system?.fonts.find((font) => font.id === previewFontId) ??
    system?.fonts.find(
      (font) =>
        font.id === system.roles.find((role) => role.id === "body")?.fontId,
    ) ??
    system?.fonts[0];

  /* Only the weights this family actually ships. More than half the catalogue
     ships exactly one, so a fixed 100-900 control would offer eight weights the
     browser could only fake. */
  const previewWeights =
    findGoogleFont(previewFont?.families[0] ?? "")?.weights ?? [];
  const resolvedPreviewWeight =
    previewWeight !== null && previewWeights.includes(previewWeight)
      ? previewWeight
      : (previewWeights.find((weight) => weight === 400) ??
        previewWeights[0] ??
        400);

  useGoogleFontsLink(system, previewFont, resolvedPreviewWeight);
  /* Bumped after every upload, so re-adding a file that keeps its name still
     makes the hook look again. */
  const [fontFileRevision, setFontFileRevision] = useState(0);
  /* Why the last picked file was refused, per entry, so the message appears
     beside the input that refused it. */
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
  const localFontStatus = useLocalFonts(system, fontFileRevision);

  const roles = system?.roles ?? [];
  const frameId = activePreviewDevice?.id ?? "desktop";
  const sizeOnFrame = (role: TypeRole) =>
    system ? resolveRoleSizePx(system, steps, role, frameId) : 16;
  const bodyRole =
    roles.find((role) => role.id === "body") ??
    roles.find((role) => role.groupId === "body");

  /* Each assessment is named, so a row keeps its identity as others come and
     go with the scale. Keying on position reuses whichever row happened to sit
     there before. */
  const warnings = system
    ? [
        {
          id: "body-size",
          result: bodyRole ? assessBodyFontSize(sizeOnFrame(bodyRole)) : null,
        },
        {
          id: "line-height",
          result: bodyRole
            ? /* The specimen decides the threshold: Thai marks need more room
                 than Latin, and this is the copy being judged. */
              assessLineHeight(
                /* The resolved ratio: the validator's thresholds are ratios,
                   and the config is an intent rather than a number. */
                resolveLineHeight(bodyRole, sizeOnFrame(bodyRole), frameId)
                  .computedLineHeightRatio,
                project?.specimenText ?? "",
              )
            : null,
        },
        { id: "scale-growth", result: assessScaleGrowth(system.ratio) },
        { id: "step-count", result: assessStepCount(system.stepCount) },
        {
          id: "role-weights",
          result: assessRoleWeights(
            roles.map((role) => ({
              role: role.id,
              fontWeight: role.fontWeight,
            })),
          ),
        },
      ].flatMap(({ id, result }) => (result ? [{ id, ...result }] : []))
    : [];

  /* What the badge counts: the warnings worth acting on. A pass is a check
     that ran and found nothing, which is not news. */
  const openWarnings = warnings.filter(
    (warning) => warning.status !== "pass",
  ).length;

  if (!hasLoadedProject) {
    return (
      <main
        aria-busy="true"
        aria-live="polite"
        className={styles.loadingPage}
        role="status"
      >
        Loading type scale…
      </main>
    );
  }

  if (!project || !system || !activePreviewDevice) {
    return (
      <TypographyCreation
        onCreate={({ name, fontFamily, baseFontSizePx, ratio, stepCount }) => {
          setProject({
            /* A new scale starts with six headings and one body. Neither group
               is special afterwards. */
            system: defaultSystem(
              name,
              splitFontFamily(fontFamily),
              baseFontSizePx,
              ratio,
              stepCount,
            ),
            unit: DEFAULT_UNIT,
            specimenText: DEFAULT_SPECIMEN_TEXT,
            template: DEFAULT_TEMPLATE,
            previewDevices: defaultPreviewDevices(ratio),
          });
        }}
      />
    );
  }

  const sortedSteps = [...steps].sort(
    (first, second) => second.fontSizePx - first.fontSizePx,
  );
  const rolesLargeToSmall = [...roles].sort(
    (first, second) => sizeOnFrame(second) - sizeOnFrame(first),
  );
  const devices = project.previewDevices;
  const activeDevice = activePreviewDevice;
  const handleBindStep = (id: string, stepOffset: number) =>
    bindRoleStep(id, activeDevice.id, stepOffset);
  const handleUnlinkSize = (id: string, fontSizePx: number) =>
    unlinkRoleSize(id, activeDevice.id, fontSizePx);
  const handleLineHeightOverride = (id: string, lineHeight: LineHeightConfig) =>
    unlinkLineHeight(id, activeDevice.id, lineHeight);
  const handleLineHeightRelink = (id: string) =>
    bindLineHeight(id, activeDevice.id);

  /* Templates receive resolved CSS so they never do scale maths themselves.
     Sizes stay in px here: this is a rendered preview, not exported output.

     Which role a slot draws is `resolveTemplateSlot` in the package, shared
     with the documentation page. The chain that used to be here — exact id,
     then group, then body — put five of the six slots on body for any workspace
     built on the merged model, because it has none of the names a template asks
     for except `body`. The article rendered its kicker, hero, standfirst,
     byline and section headings all at 16px. */
  const styleOfRole = (role: TypeRole): CSSProperties => {
    const fontSizePx = sizeOnFrame(role);
    return {
      fontFamily: fontFamilyValue(system, role),
      fontSize: `${fontSizePx}px`,
      fontWeight: role.fontWeight,
      lineHeight: resolveLineHeight(role, fontSizePx, activeDevice.id)
        .computedLineHeightRatio,
      letterSpacing: `${role.letterSpacingPx}px`,
      textTransform: role.textTransform,
    };
  };

  const styleForRole = (slot: SemanticRole): CSSProperties => {
    const role = resolveTemplateSlot(system, slot);
    return role ? styleOfRole(role) : {};
  };

  return (
    <main className={styles.workspace}>
      <header className={styles.topbar}>
        <WorkspaceBrand
          name={system.name}
          onChange={(name) => updateSystem({ name })}
        />
        <PreviewDeviceBar
          className={styles.navigation}
          activeId={activeDevice.id}
          devices={devices}
          onChange={setPreviewDevice}
        />
        <span className={styles.headerActions}>
          <ThemeControl />
          <WorkspaceNav active="typography" />
          <Button
            aria-label="Export type scale"
            scheme="neutral"
            size="small"
            variant="outlined"
            onClick={() => setIsExportDialogOpen(true)}
          >
            Export
          </Button>
        </span>
      </header>

      <section aria-label="Typography toolbar" className={styles.toolbar}>
        <nav aria-label="Typography views">
          <TabList
            size="sm"
            value={activeSection}
            onChange={(value) => setActiveSection(value as TypographySection)}
          >
            <Tab label="Editor" value="editor" />
            <Tab label="Preview" value="preview" />
          </TabList>
        </nav>
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

      <section
        className={styles.editor}
        style={
          {
            "--inspector-width": `${inspectorPanel.size}px`,
          } as CSSProperties
        }
      >
        {activeSection === "editor" ? (
          <section aria-label="Generated type steps" className={styles.canvas}>
            {/* Sits above the steps so the unit is chosen where the sizes are
                read, not buried in the export dialog. */}
            <div className="flex flex-wrap items-center gap-2 pb-3">
              <SegmentedControl
                label="Size unit"
                size="sm"
                value={project.unit}
                onChange={(value) =>
                  setPreference({ unit: value as TypeScaleUnit })
                }
              >
                {TYPE_SCALE_UNITS.map((unit) => (
                  <SegmentedControlItem
                    key={unit}
                    label={unit.toUpperCase()}
                    value={unit}
                  />
                ))}
              </SegmentedControl>

              {/* Only worth showing once there is a choice to make. */}
              {system.fonts.length > 1 && (
                <SegmentedControl
                  label="Preview font"
                  size="sm"
                  value={previewFont?.id ?? ""}
                  onChange={setPreviewFontId}
                >
                  {system.fonts.map((font) => (
                    <SegmentedControlItem
                      key={font.id}
                      label={font.name}
                      value={font.id}
                    />
                  ))}
                </SegmentedControl>
              )}

              {previewWeights.length > 1 && (
                <div className="w-28">
                  <Selector
                    isLabelHidden
                    label="Preview weight"
                    options={previewWeights.map((weight) => ({
                      label: String(weight),
                      value: String(weight),
                    }))}
                    size="sm"
                    value={String(resolvedPreviewWeight)}
                    onChange={(value) => setPreviewWeight(Number(value))}
                  />
                </div>
              )}
            </div>
            <ul className={styles.stepList}>
              {sortedSteps.map((step) => {
                const stepRoles = roles.filter(
                  (role) =>
                    !isRoleUnlinkedOnDevice(role, activeDevice.id) &&
                    role.stepOffset === step.offset,
                );
                return (
                  <li key={step.step} className={styles.stepRow}>
                    {/* Editable in place: type in any row and every row
                        follows, so the scale is judged in your own copy without
                        a separate field to find. */}
                    <span
                      className={styles.stepSampleBox}
                      style={{
                        fontFamily: familiesToCss(previewFont?.families ?? []),
                        fontSize: `${step.fontSizePx}px`,
                        fontWeight: resolvedPreviewWeight,
                      }}
                    >
                      {/* The measurement, not a duplicate.

                          An input's box is the line box of its primary family,
                          and it clips — so a fallback covering another script
                          sits taller than the box and loses the marks above
                          and below. A span is sized by every font that ends up
                          drawing, which is the height the row actually needs.
                          It sets the height and the input fills it. */}
                      <span
                        aria-hidden="true"
                        className={styles.stepSampleMirror}
                      >
                        {project.specimenText || DEFAULT_SPECIMEN_TEXT}
                      </span>
                      <input
                        aria-label="Specimen text"
                        className={styles.stepSample}
                        placeholder={DEFAULT_SPECIMEN_TEXT}
                        spellCheck={false}
                        value={project.specimenText}
                        onChange={(event) =>
                          setPreference({ specimenText: event.target.value })
                        }
                      />
                    </span>
                    <span className={styles.stepMeta}>
                      <code>{formatLength(step.fontSizePx, project.unit)}</code>
                      {Math.abs(step.exactFontSizePx - step.fontSizePx) >
                        0.01 && (
                        <small
                          className={styles.stepExact}
                          title={`Exact ${step.exactFontSizePx.toFixed(2)}px before rounding`}
                        >
                          {step.exactFontSizePx.toFixed(2)}
                        </small>
                      )}
                      {step.isBase && <small>base</small>}
                      {stepRoles.map((role) => (
                        <small key={role.id}>{role.id}</small>
                      ))}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : (
          <TypographyPreview
            device={activeDevice}
            roles={rolesLargeToSmall}
            specimenText={project.specimenText}
            styleFor={styleForRole}
            styleOf={styleOfRole}
            system={system}
            template={project.template}
            unit={project.unit}
            onTemplateChange={(template) => setPreference({ template })}
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

        <section aria-label="Type scale settings" className={styles.inspector}>
          {/* TabList takes no className, so the tabs are reached through a
                wrapper.

                Astryx gives a tab a 10px radius, which reads as a pill
                floating over the panel rather than a strip across the top of
                it, and pins its height at 32px with a border box — so padding
                on its own is absorbed rather than added. The height goes up by
                the 8px the padding asks for.

                The hover and selected background is not the button: it is a
                span behind the label, sized to the old 32px and rounded to
                match, so squaring the button alone left a rounded pill
                floating inside a square tab. */}
          <div className="[&_.astryx-tab]:h-10 [&_.astryx-tab]:rounded-none [&_.astryx-tab]:py-1 [&_.astryx-tab>span:first-child]:h-full [&_.astryx-tab>span:first-child]:rounded-none">
            <TabList
              hasDivider
              layout="fill"
              /* The tabs pattern rather than navigation: these switch panels
                 in place, and `panelId` is how a screen reader gets from a
                 tab to the panel it opened. */
              role="tablist"
              value={inspectorTab}
              onChange={(value) =>
                setInspectorTab(value as typeof inspectorTab)
              }
            >
              <Tab
                label="Settings"
                panelId="inspector-settings"
                value="settings"
              />
              <Tab label="Groups" panelId="inspector-groups" value="groups" />
              <Tab
                label="Warnings"
                panelId="inspector-warnings"
                value="warnings"
                /* Counts only, which is what a badge is for. Absent at zero:
                   a badge reading 0 is a count of nothing taking up the room
                   of a count of something. */
                endContent={
                  openWarnings > 0 ? (
                    <Badge label={String(openWarnings)} variant="warning" />
                  ) : undefined
                }
              />
            </TabList>
          </div>

          <div
            hidden={inspectorTab !== "settings"}
            id="inspector-settings"
            role="tabpanel"
          >
            <div className={styles.settingGroup}>
              <h2>Scale</h2>
              <NumberInput
                description="Even numbers only."
                label="Base font size"
                min={MIN_BASE_FONT_SIZE_PX}
                max={MAX_BASE_FONT_SIZE_PX}
                step={2}
                units="px"
                value={system.baseFontSizePx}
                onChange={(value) => updateSystem({ baseFontSizePx: value })}
              />
              <NumberInput
                isIntegerOnly
                label="Number of steps"
                min={MIN_STEP_COUNT}
                max={MAX_STEP_COUNT}
                value={system.stepCount}
                onChange={(value) => updateSystem({ stepCount: value })}
              />
            </div>

            <PreviewDeviceSettings
              detachedRatios={detachedRatios}
              devices={devices}
              presets={SCALE_RATIO_PRESETS}
              onAddDesktop={handleAddDesktop}
              onRatioChange={handleDeviceRatio}
              onRemove={handleRemoveDevice}
              onWidthChange={handleDeviceWidth}
            />

            <div className={styles.settingGroup}>
              <h2>Fonts</h2>
              {system.fonts.map((font) => (
                <FontStackEditor
                  key={font.id}
                  canRemove={system.fonts.length > 1}
                  font={font}
                  onPick={(slot, family, generic) => {
                    /* Picking a Google family for a slot that held a file
                       leaves those bytes referenced by nothing — and only
                       that slot's, since the other one may still point at
                       its own. */
                    if (isLocalSlot(font, slot)) {
                      void forgetFontSlot(font.id, slot);
                      setFontFileRevision((current) => current + 1);
                    }
                    setGoogleFont(font.id, slot, family, generic);
                  }}
                  onRemove={() => {
                    void forgetFontEntry(font.id);
                    removeFont(font.id);
                  }}
                  onRemoveSlot={(slot) => {
                    /* The file goes first, then the ones behind it follow
                       their family forward a slot. Both before the state
                       change, so a reload mid-way finds files under the keys
                       the stored stack names — and in this order, because
                       moving into the slot being emptied would overwrite the
                       file that is on its way out. */
                    const moves = fallbackFileMoves(font, slot);
                    if (isLocalSlot(font, slot) || moves.length > 0) {
                      void forgetFontSlot(font.id, slot)
                        .then(() =>
                          Promise.all(
                            moves.map((move) =>
                              moveLocalFont(font.id, move.from, move.to),
                            ),
                          ),
                        )
                        .then(() =>
                          setFontFileRevision((current) => current + 1),
                        );
                    }
                    removeFontSlot(font.id, slot);
                  }}
                  fileStatus={(slot) =>
                    localFontStatus.get(localFontKey(font.id, slot)) ??
                    "checking"
                  }
                  uploadError={(slot) =>
                    uploadErrors[localFontKey(font.id, slot)] ?? ""
                  }
                  onRename={(name) => renameFont(font.id, name)}
                  onUpload={(slot, file) => {
                    void storeLocalFont(font.id, slot, file).then((result) => {
                      setUploadErrors((current) => ({
                        ...current,
                        [localFontKey(font.id, slot)]: result.rejected ?? "",
                      }));
                      if (!result.family) return;
                      setLocalFont(font.id, slot, result.family);
                      setFontFileRevision((current) => current + 1);
                    });
                  }}
                />
              ))}
              <Button
                className={styles.addEntryButton}
                scheme="primary"
                size="medium"
                variant="contained"
                onClick={addFont}
              >
                Add font
              </Button>
            </div>
          </div>

          <div
            hidden={inspectorTab !== "groups"}
            id="inspector-groups"
            role="tabpanel"
          >
            {/* Groups are an order somebody arranges, so they are dragged
                rather than stepped. The keyboard sensor is not a nicety here:
                it is the whole of the keyboard story now that the up and down
                buttons are gone — focus a handle, space to lift, arrows to
                move, space to drop. */}
            <DndContext
              collisionDetection={closestCenter}
              sensors={sensors}
              onDragEnd={({ active, over }) => {
                if (!over) return;
                reorderGroups(String(active.id), String(over.id));
              }}
            >
              <SortableContext
                items={system.groups.map((group) => group.id)}
                strategy={verticalListSortingStrategy}
              >
                {system.groups.map((group) => (
                  <RoleGroupEditor
                    key={group.id}
                    canAddRole={canAddRole(system, group)}
                    deviceId={activeDevice.id}
                    fonts={system.fonts}
                    group={group}
                    roles={roles.filter((role) => role.groupId === group.id)}
                    steps={sortedSteps}
                    system={system}
                    onAddRole={() => addRole(group)}
                    onBindStep={handleBindStep}
                    onIndexingChange={(indexing) =>
                      updateGroup(group.id, { indexing })
                    }
                    onLabelChange={(label) => updateGroup(group.id, { label })}
                    onLabelCommit={() => renameGroupById(group.id, group.label)}
                    onRemove={() => removeGroup(group.id)}
                    onRoleChange={updateRole}
                    onRoleRemove={removeRole}
                    onRoleValueChange={updateRoleValue}
                    onLineHeightOverride={handleLineHeightOverride}
                    onLineHeightRelink={handleLineHeightRelink}
                    onUnlinkSize={handleUnlinkSize}
                  />
                ))}
              </SortableContext>
            </DndContext>

            <div className={styles.settingGroup}>
              <Button
                className={styles.addEntryButton}
                scheme="primary"
                size="medium"
                variant="contained"
                onClick={addGroup}
              >
                Add group
              </Button>
            </div>
          </div>

          <div
            hidden={inspectorTab !== "warnings"}
            id="inspector-warnings"
            role="tabpanel"
          >
            <div className={styles.settingGroup}>
              <h2>Warnings</h2>
              <ul className={styles.warningList}>
                {warnings
                  .filter((warning) => warning.status !== "pass")
                  .map((warning) => (
                    <li key={warning.id} data-status={warning.status}>
                      {warning.summary}
                    </li>
                  ))}
                {openWarnings === 0 && (
                  <li data-status="pass">
                    No issues found in this type scale.
                  </li>
                )}
              </ul>
            </div>
          </div>
        </section>
      </section>

      <TypographyExportDialog
        isOpen={isExportDialogOpen}
        projectName={system.name}
        system={system}
        unit={project.unit}
        devices={project.previewDevices}
        onOpenChange={setIsExportDialogOpen}
        onUnitChange={(unit) => setPreference({ unit })}
      />

      <AlertDialog
        actionLabel="Start new project"
        description="This removes the current type scale from this browser. Export it first if you want to keep it."
        isOpen={isNewProjectDialogOpen}
        title="Start a new project?"
        onAction={() => {
          setIsNewProjectDialogOpen(false);
          /* The whole scale goes, so every file it named goes with it — both
             slots of every entry, not only the ones currently marked local. */
          void forgetLocalFonts(system.fonts.map((font) => font.id));
          setProject(null);
        }}
        onOpenChange={setIsNewProjectDialogOpen}
      />
    </main>
  );
}
