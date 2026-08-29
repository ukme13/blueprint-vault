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
  resolveRoleSizePx,
  TYPE_SCALE_UNITS,
  TYPE_SCALE_RATIO_PRESETS,
  type PaletteProjectData,
  type TypeRole,
  type TypeScaleUnit,
  type TypeSystem,
} from "@blueprint/ui";
import { TypographyCreation } from "./TypographyCreation";
import { TypographyExportDialog } from "./TypographyExportDialog";
import { WorkspaceNav } from "../WorkspaceNav";
import { type PreviewLanguage, type PreviewWidth } from "./preview-templates";
import { FontStackEditor } from "./FontStackEditor";
import { RoleGroupEditor } from "./RoleGroupEditor";
import { TypographyPreview } from "./TypographyPreview";
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
import { useTypographySystem } from "./use-typography-system";
import styles from "./typography-workspace.module.css";
import type { TypographySection } from "./types";

export function TypographyStudio() {
  const [project, setProject] = useState<TypographyProject | null>(null);
  const [hasLoadedProject, setHasLoadedProject] = useState(false);
  const [activeSection, setActiveSection] =
    useState<TypographySection>("editor");
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false);
  /* Width and language are ways of looking at the project, not part of it, so
     they are view state rather than persisted fields. */
  const [previewWidth, setPreviewWidth] = useState<PreviewWidth>("desktop");
  const [previewLang, setPreviewLang] = useState<PreviewLanguage>("en");
  /* Which font entry the step list renders in. The steps are sizes shared by
     several roles, so they have no font of their own to follow. */
  const [previewFontId, setPreviewFontId] = useState<string | null>(null);
  /* The palette half of the same workspace, read once on load. Preview colours
     are a way of looking at the scale, so the chosen pair is view state. */
  const [palette, setPalette] = useState<PaletteProjectData | null>(null);
  const [textShade, setTextShade] = useState<ShadeRef | null>(null);
  const [backgroundShade, setBackgroundShade] = useState<ShadeRef | null>(null);
  const [previewWeight, setPreviewWeight] = useState<number | null>(null);
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

  /* Steps still come from the base and ratio; roles linked to a step follow
     them, roles with step: null keep the size someone set by hand. */
  const steps = useMemo(() => {
    if (!system) return [];
    return generateTypeSteps(
      system.baseFontSizePx,
      system.ratio,
      system.stepCount,
    );
  }, [system]);

  const resolvedRoles = useMemo((): TypeRole[] => {
    if (!system) return [];
    return system.roles.map((role) => {
      const size = resolveRoleSizePx(system, steps, role);
      return {
        ...role,
        desktop: { ...role.desktop, fontSizePx: size },
        mobile: { ...role.mobile, fontSizePx: size },
      };
    });
  }, [system, steps]);

  const paletteTracks = useMemo(
    () => (palette ? generatePalettes(palette) : []),
    [palette],
  );

  const resolvedSystem: TypeSystem | null = system
    ? { ...system, roles: resolvedRoles }
    : null;

  const {
    addFont,
    addGroup,
    addRole,
    removeFont,
    removeGroup,
    removeRole,
    renameFont,
    renameGroupById,
    setFontFamilies,
    shiftGroup,
    updateGroup,
    updateRole,
    updateRoleValue,
    updateSystem,
  } = useTypographySystem(setProject);

  /* Unit, specimen and template sit beside the system rather than in it, so
     they do not go through the hook. This is the same guard it keeps, once. */
  const setPreference = (patch: Partial<Omit<TypographyProject, "system">>) =>
    setProject((current) => (current ? { ...current, ...patch } : current));

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

  const bodyRole =
    resolvedRoles.find((role) => role.id === "body") ??
    resolvedRoles.find((role) => role.groupId === "body");

  /* Each assessment is named, so a row keeps its identity as others come and
     go with the scale. Keying on position reuses whichever row happened to sit
     there before. */
  const warnings = system
    ? [
        {
          id: "body-size",
          result: bodyRole
            ? assessBodyFontSize(bodyRole.desktop.fontSizePx)
            : null,
        },
        {
          id: "line-height",
          result: bodyRole
            ? assessLineHeight(bodyRole.desktop.lineHeight)
            : null,
        },
        { id: "scale-growth", result: assessScaleGrowth(system.ratio) },
        { id: "step-count", result: assessStepCount(system.stepCount) },
        {
          id: "role-weights",
          result: assessRoleWeights(
            resolvedRoles.map((role) => ({
              role: role.id,
              fontWeight: role.fontWeight,
            })),
          ),
        },
      ].flatMap(({ id, result }) => (result ? [{ id, ...result }] : []))
    : [];

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

  if (!project || !system || !resolvedSystem) {
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
          });
        }}
      />
    );
  }

  const sortedSteps = [...steps].sort(
    (first, second) => second.fontSizePx - first.fontSizePx,
  );
  const rolesLargeToSmall = [...resolvedRoles].sort(
    (first, second) => second.desktop.fontSizePx - first.desktop.fontSizePx,
  );

  /* Templates receive resolved CSS so they never do scale maths themselves.
     Sizes stay in px here: this is a rendered preview, not exported output. */
  const styleForRole = (roleId: string): CSSProperties => {
    /* Templates ask for roles by name. An arbitrary system may not have the one
       a template wants, so fall back within the group, then to body, then to
       anything — a template must never render unstyled. */
    const role =
      resolvedRoles.find((candidate) => candidate.id === roleId) ??
      resolvedRoles.find((candidate) => candidate.groupId === roleId) ??
      bodyRole ??
      resolvedRoles[0];
    if (!role) return {};

    return {
      fontFamily: fontFamilyValue(resolvedSystem, role),
      fontSize: `${role.desktop.fontSizePx}px`,
      fontWeight: role.fontWeight,
      lineHeight: role.desktop.lineHeight,
      letterSpacing: `${role.desktop.letterSpacingPx}px`,
      textTransform: role.textTransform,
    };
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
          <input
            aria-label="Project name"
            className={styles.projectNameInput}
            maxLength={80}
            spellCheck={false}
            value={system.name}
            onChange={(event) => updateSystem({ name: event.target.value })}
          />
        </p>
        <nav aria-label="Playground sections" className={styles.navigation}>
          <TabList
            size="sm"
            value={activeSection}
            onChange={(value) => setActiveSection(value as TypographySection)}
          >
            <Tab label="Editor" value="editor" />
            <Tab label="Preview" value="preview" />
          </TabList>
        </nav>
        <span className={styles.headerActions}>
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

      {activeSection === "editor" && (
        <section
          className={styles.editor}
          style={
            {
              "--inspector-width": `${inspectorPanel.size}px`,
            } as CSSProperties
          }
        >
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
                const stepRoles = resolvedRoles.filter(
                  (role) => role.stepOffset === step.offset,
                );
                return (
                  <li key={step.step} className={styles.stepRow}>
                    {/* Editable in place: type in any row and every row
                        follows, so the scale is judged in your own copy without
                        a separate field to find. */}
                    <input
                      aria-label="Specimen text"
                      className={styles.stepSample}
                      placeholder={DEFAULT_SPECIMEN_TEXT}
                      spellCheck={false}
                      style={{
                        fontFamily: familiesToCss(previewFont?.families ?? []),
                        fontSize: `${step.fontSizePx}px`,
                        fontWeight: resolvedPreviewWeight,
                      }}
                      value={project.specimenText}
                      onChange={(event) =>
                        setPreference({ specimenText: event.target.value })
                      }
                    />
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

          <section
            aria-label="Type scale settings"
            className={styles.inspector}
          >
            <header className={styles.inspectorHeader}>Scale settings</header>

            <div className={styles.settingGroup}>
              <h2>Base settings</h2>
              {system.fonts.map((font) => (
                <FontStackEditor
                  key={font.id}
                  canRemove={system.fonts.length > 1}
                  font={font}
                  onChange={(families) => setFontFamilies(font.id, families)}
                  onRemove={() => removeFont(font.id)}
                  onRename={(name) => renameFont(font.id, name)}
                />
              ))}
              <Button
                className={styles.addEntryButton}
                scheme="neutral"
                size="small"
                variant="outlined"
                onClick={addFont}
              >
                Add font
              </Button>

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
              <Selector
                label="Scale ratio"
                options={[
                  ...TYPE_SCALE_RATIO_PRESETS.map((preset) => ({
                    label: `${preset.name} (${preset.ratio})`,
                    value: String(preset.ratio),
                  })),
                ]}
                value={String(system.ratio)}
                onChange={(value) => updateSystem({ ratio: Number(value) })}
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

            {system.groups.map((group, groupIndex) => (
              <RoleGroupEditor
                key={group.id}
                canAddRole={canAddRole(system, group)}
                fonts={system.fonts}
                group={group}
                groupCount={system.groups.length}
                index={groupIndex}
                roles={resolvedRoles.filter(
                  (role) => role.groupId === group.id,
                )}
                steps={sortedSteps}
                unit={project.unit}
                onAddRole={() => addRole(group)}
                onIndexingChange={(indexing) =>
                  updateGroup(group.id, { indexing })
                }
                onLabelChange={(label) => updateGroup(group.id, { label })}
                onLabelCommit={() => renameGroupById(group.id, group.label)}
                onMove={(direction) => shiftGroup(group.id, direction)}
                onRemove={() => removeGroup(group.id)}
                onRoleChange={updateRole}
                onRoleRemove={removeRole}
                onRoleValueChange={updateRoleValue}
              />
            ))}

            <div className={styles.settingGroup}>
              <Button
                className={styles.addEntryButton}
                scheme="neutral"
                size="small"
                variant="outlined"
                onClick={addGroup}
              >
                Add group
              </Button>
            </div>

            {warnings.length > 0 && (
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
                  {warnings.every((warning) => warning.status === "pass") && (
                    <li data-status="pass">
                      No issues found in this type scale.
                    </li>
                  )}
                </ul>
              </div>
            )}
          </section>
        </section>
      )}

      {activeSection === "preview" && (
        <TypographyPreview
          lang={previewLang}
          roles={rolesLargeToSmall}
          specimenText={project.specimenText}
          styleFor={styleForRole}
          system={resolvedSystem}
          template={project.template}
          unit={project.unit}
          width={previewWidth}
          onLangChange={setPreviewLang}
          onTemplateChange={(template) => setPreference({ template })}
          backgroundShade={backgroundShade}
          textShade={textShade}
          tracks={paletteTracks}
          onBackgroundShadeChange={setBackgroundShade}
          onTextShadeChange={setTextShade}
          onWidthChange={setPreviewWidth}
        />
      )}

      <TypographyExportDialog
        isOpen={isExportDialogOpen}
        projectName={system.name}
        system={resolvedSystem}
        unit={project.unit}
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
          setProject(null);
        }}
        onOpenChange={setIsNewProjectDialogOpen}
      />
    </main>
  );
}
