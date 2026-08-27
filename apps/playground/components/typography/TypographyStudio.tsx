"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { ResizeHandle, useResizable } from "@astryxdesign/core/Resizable";
import { Selector } from "@astryxdesign/core/Selector";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { TextInput } from "@astryxdesign/core/TextInput";
import {
  assessBodyFontSize,
  assessLineHeight,
  assessRoleWeights,
  assessScaleGrowth,
  assessStepCount,
  assignDefaultRoles,
  Button,
  generateTypeSteps,
  MAX_BASE_FONT_SIZE_PX,
  MAX_STEP_COUNT,
  MIN_BASE_FONT_SIZE_PX,
  MIN_STEP_COUNT,
  fontFamilyValue,
  formatLength,
  migrateLegacyProject,
  splitFontFamily,
  defaultElementForRole,
  nextRoleId,
  TYPE_ROLE_GROUP_LABELS,
  TYPE_ROLE_GROUPS,
  TYPE_SCALE_UNITS,
  TYPE_SCALE_RATIO_PRESETS,
  type RoleAssignment,
  type SemanticRole,
  type LegacyTypographyProject,
  type TypeRole,
  type TypeRoleGroup,
  type TypeScaleUnit,
  type TypeSystem,
} from "@blueprint/ui";
import { TypographyCreation } from "./TypographyCreation";
import { TypographyExportDialog } from "./TypographyExportDialog";
import { WorkspaceNav } from "../WorkspaceNav";
import {
  ArticleTemplate,
  MarketingTemplate,
  PREVIEW_TEMPLATES,
  PREVIEW_WIDTH_OPTIONS,
  PREVIEW_WIDTHS,
  type PreviewLanguage,
  type PreviewTemplateId,
  type PreviewWidth,
} from "./preview-templates";
import styles from "./typography-workspace.module.css";
import type { RoleStyleMap, TypographySection } from "./types";

const TYPOGRAPHY_STORAGE_KEY = "blueprint.typography-project.v1";

interface TypographyProject {
  /** The typography system itself. Everything else here is a preference. */
  system: TypeSystem;
  /** Output unit. Optional in storage: projects saved before units existed. */
  unit: TypeScaleUnit;
  /** Text shown at every step so a scale can be judged in real copy. */
  specimenText: string;
  /** Which preview template the Preview section shows. */
  template: PreviewTemplateId;
}

const DEFAULT_UNIT: TypeScaleUnit = "rem";
const DEFAULT_SPECIMEN_TEXT = "How vexingly quick daft zebras jump";
const DEFAULT_TEMPLATE: PreviewTemplateId = "specimen";

/** Elements a role may render as. Kept short: these cover the type roles. */
const ELEMENT_OPTIONS = [
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "label",
  "span",
  "small",
];

const PREVIEW_TEXT: Record<SemanticRole, { en: string; th: string }> = {
  display: { en: "Design with clarity", th: "ออกแบบด้วยความชัดเจน" },
  heading: {
    en: "Build a stable type scale",
    th: "สร้างสเกลตัวอักษรที่มั่นคง",
  },
  title: {
    en: "Semantic roles, not raw sizes",
    th: "บทบาทเชิงความหมาย ไม่ใช่ขนาดดิบ",
  },
  body: {
    en: "Blueprint generates a modular scale from a base size and ratio, then maps each step to a semantic role so components stay consistent.",
    th: "Blueprint สร้างสเกลตัวอักษรจากขนาดฐานและอัตราส่วน แล้วจับคู่แต่ละขั้นกับบทบาทเชิงความหมาย เพื่อให้คอมโพเนนต์มีความสม่ำเสมอ",
  },
  label: { en: "Field label", th: "ป้ายกำกับฟิลด์" },
  caption: { en: "Last updated a moment ago", th: "อัปเดตล่าสุดเมื่อสักครู่" },
};

function defaultRoleStyles(roles: RoleAssignment[]): RoleStyleMap {
  return Object.fromEntries(
    roles.map((role) => [
      role.role,
      {
        fontWeight: role.fontWeight,
        lineHeight: role.lineHeight,
        letterSpacingPx: role.letterSpacingPx,
      },
    ]),
  ) as RoleStyleMap;
}

function readStoredProject(): TypographyProject | null {
  try {
    const stored = window.localStorage.getItem(TYPOGRAPHY_STORAGE_KEY);
    if (!stored) return null;

    const parsed: unknown = JSON.parse(stored);
    if (!parsed || typeof parsed !== "object") return null;

    const prefs = readPreferences(parsed);

    /* Two shapes live under this key. The pre-merge one has roleStyles and a
       flat fontFamily; the merged one has a system. Detect rather than version,
       so nobody's saved work is orphaned by the rename. */
    if ("roleStyles" in parsed && !("system" in parsed)) {
      const legacy = parsed as unknown as LegacyTypographyProject;
      if (
        typeof legacy.name !== "string" ||
        typeof legacy.fontFamily !== "string" ||
        typeof legacy.baseFontSizePx !== "number" ||
        typeof legacy.ratio !== "number" ||
        typeof legacy.stepCount !== "number" ||
        !legacy.roleStyles
      ) {
        return null;
      }
      return { system: migrateLegacyProject(legacy), ...prefs };
    }

    if (!("system" in parsed)) return null;
    const system = parsed.system as TypeSystem;
    if (
      !system ||
      typeof system !== "object" ||
      !Array.isArray(system.roles) ||
      !Array.isArray(system.fonts) ||
      typeof system.baseFontSizePx !== "number"
    ) {
      return null;
    }

    return { system, ...prefs };
  } catch {
    return null;
  }
}

function readPreferences(parsed: object): {
  unit: TypeScaleUnit;
  specimenText: string;
  template: PreviewTemplateId;
} {
  return {
    unit:
      "unit" in parsed &&
      TYPE_SCALE_UNITS.includes(parsed.unit as TypeScaleUnit)
        ? (parsed.unit as TypeScaleUnit)
        : DEFAULT_UNIT,
    specimenText:
      "specimenText" in parsed && typeof parsed.specimenText === "string"
        ? parsed.specimenText
        : DEFAULT_SPECIMEN_TEXT,
    template:
      "template" in parsed &&
      PREVIEW_TEMPLATES.some((entry) => entry.id === parsed.template)
        ? (parsed.template as PreviewTemplateId)
        : DEFAULT_TEMPLATE,
  };
}

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
  const inspectorPanel = useResizable({
    autoSaveId: "blueprint-typography-inspector",
    defaultSize: 340,
    minSizePx: 300,
    maxSizePx: 520,
  });

  useEffect(() => {
    /* Reading localStorage must happen in an effect: a useState initializer
       would run during SSR, where window does not exist, and desync
       hydration. */
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProject(readStoredProject());
    setHasLoadedProject(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedProject) return;

    if (project) {
      window.localStorage.setItem(
        TYPOGRAPHY_STORAGE_KEY,
        JSON.stringify(project),
      );
    } else {
      window.localStorage.removeItem(TYPOGRAPHY_STORAGE_KEY);
    }
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
      if (role.step === null) return role;
      const step = steps.find((candidate) => candidate.step === role.step);
      if (!step) return role;
      return {
        ...role,
        desktop: { ...role.desktop, fontSizePx: step.fontSizePx },
        mobile: { ...role.mobile, fontSizePx: step.fontSizePx },
      };
    });
  }, [system, steps]);

  const resolvedSystem: TypeSystem | null = system
    ? { ...system, roles: resolvedRoles }
    : null;

  const updateSystem = (patch: Partial<TypeSystem>) =>
    setProject((current) =>
      current
        ? { ...current, system: { ...current.system, ...patch } }
        : current,
    );

  const updateRole = (id: string, patch: Partial<TypeRole>) =>
    setProject((current) =>
      current
        ? {
            ...current,
            system: {
              ...current.system,
              roles: current.system.roles.map((role) =>
                role.id === id ? { ...role, ...patch } : role,
              ),
            },
          }
        : current,
    );

  /* Editing a size by hand unlinks the role from the scale, so the ratio stops
     driving it. Line height and spacing are always per-role and never linked. */
  const updateRoleValue = (
    id: string,
    patch: Partial<{ lineHeight: number; letterSpacingPx: number }>,
  ) =>
    setProject((current) =>
      current
        ? {
            ...current,
            system: {
              ...current.system,
              roles: current.system.roles.map((role) =>
                role.id === id
                  ? {
                      ...role,
                      desktop: { ...role.desktop, ...patch },
                      mobile: { ...role.mobile, ...patch },
                    }
                  : role,
              ),
            },
          }
        : current,
    );

  const addRole = (group: TypeRoleGroup) =>
    setProject((current) => {
      if (!current) return current;
      const id = nextRoleId(current.system, group);
      const template =
        current.system.roles.find((role) => role.group === group) ??
        current.system.roles[0];
      if (!template) return current;

      return {
        ...current,
        system: {
          ...current.system,
          roles: [
            ...current.system.roles,
            {
              ...template,
              id,
              name: id,
              group,
              element: defaultElementForRole(id),
              /* A new role starts unlinked: it copies a sibling's size rather
                 than claiming a step that already belongs to another role. */
              step: null,
            },
          ],
        },
      };
    });

  const removeRole = (id: string) =>
    setProject((current) =>
      current
        ? {
            ...current,
            system: {
              ...current.system,
              roles: current.system.roles.filter((role) => role.id !== id),
            },
          }
        : current,
    );

  const bodyRole =
    resolvedRoles.find((role) => role.id === "body") ??
    resolvedRoles.find((role) => role.group === "body");

  const warnings = system
    ? [
        bodyRole ? assessBodyFontSize(bodyRole.desktop.fontSizePx) : null,
        bodyRole ? assessLineHeight(bodyRole.desktop.lineHeight) : null,
        assessScaleGrowth(system.ratio),
        assessStepCount(system.stepCount),
        assessRoleWeights(
          resolvedRoles.map((role) => ({
            role: role.id as never,
            step: role.step ?? 0,
            fontWeight: role.fontWeight,
            lineHeight: role.desktop.lineHeight,
            letterSpacingPx: role.desktop.letterSpacingPx,
          })),
        ),
      ].filter(
        (result): result is NonNullable<typeof result> => result !== null,
      )
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
          const initialSteps = generateTypeSteps(
            baseFontSizePx,
            ratio,
            stepCount,
          );
          setProject({
            system: migrateLegacyProject({
              name,
              fontFamily,
              baseFontSizePx,
              ratio,
              stepCount,
              roleStyles: defaultRoleStyles(assignDefaultRoles(initialSteps)),
            }),
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
      resolvedRoles.find((candidate) => candidate.group === roleId) ??
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
        <TextInput
          className={styles.specimenInput}
          label="Specimen text"
          placeholder={DEFAULT_SPECIMEN_TEXT}
          size="sm"
          value={project.specimenText}
          onChange={(value) =>
            setProject((current) =>
              current ? { ...current, specimenText: value } : current,
            )
          }
        />
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
            <ul className={styles.stepList}>
              {sortedSteps.map((step) => {
                const stepRoles = resolvedRoles.filter(
                  (role) => role.step === step.step,
                );
                return (
                  <li key={step.step} className={styles.stepRow}>
                    <span
                      className={styles.stepSample}
                      style={{
                        fontFamily: fontFamilyValue(
                          resolvedSystem,
                          bodyRole ?? resolvedRoles[0]!,
                        ),
                        fontSize: `${step.fontSizePx}px`,
                      }}
                    >
                      {project.specimenText || "Ag"}
                    </span>
                    <span className={styles.stepMeta}>
                      <code>{formatLength(step.fontSizePx, project.unit)}</code>
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
              {system.fonts.map((font, index) => (
                <TextInput
                  key={font.id}
                  description={
                    index === 0
                      ? "Comma separated. Later families cover glyphs the first lacks."
                      : undefined
                  }
                  label={`${font.name} font stack`}
                  value={font.families.join(", ")}
                  onChange={(value) =>
                    updateSystem({
                      fonts: system.fonts.map((candidate) =>
                        candidate.id === font.id
                          ? { ...candidate, families: splitFontFamily(value) }
                          : candidate,
                      ),
                    })
                  }
                />
              ))}
              <NumberInput
                label="Base font size"
                min={MIN_BASE_FONT_SIZE_PX}
                max={MAX_BASE_FONT_SIZE_PX}
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

            {TYPE_ROLE_GROUPS.map((group) => {
              const groupRoles = rolesLargeToSmall.filter(
                (role) => role.group === group,
              );

              return (
                <div key={group} className={styles.settingGroup}>
                  <header className={styles.roleGroupHeader}>
                    <h2>{TYPE_ROLE_GROUP_LABELS[group]}</h2>
                    <Button
                      scheme="neutral"
                      size="xs"
                      variant="text"
                      onClick={() => addRole(group)}
                    >
                      Add
                    </Button>
                  </header>

                  {groupRoles.length === 0 && (
                    <p className={styles.roleGroupEmpty}>No roles yet.</p>
                  )}

                  {groupRoles.map((role) => (
                    <div key={role.id} className={styles.roleSetting}>
                      <div className={styles.roleSettingTop}>
                        <span className={styles.roleSettingLabel}>
                          {role.id}
                        </span>
                        <Button
                          aria-label={`Remove ${role.id}`}
                          scheme="neutral"
                          size="xs"
                          variant="text"
                          onClick={() => removeRole(role.id)}
                        >
                          Remove
                        </Button>
                      </div>

                      <Selector
                        label={`${role.id} element`}
                        options={ELEMENT_OPTIONS.map((element) => ({
                          label: element,
                          value: element,
                        }))}
                        value={role.element}
                        onChange={(value) =>
                          updateRole(role.id, { element: value })
                        }
                      />
                      <Selector
                        label={`${role.id} font`}
                        options={system.fonts.map((font) => ({
                          label: font.name,
                          value: font.id,
                        }))}
                        value={role.fontId}
                        onChange={(value) =>
                          updateRole(role.id, { fontId: value })
                        }
                      />
                      <NumberInput
                        isIntegerOnly
                        label={`${role.id} font weight`}
                        min={100}
                        max={900}
                        step={100}
                        value={role.fontWeight}
                        onChange={(value) =>
                          updateRole(role.id, { fontWeight: value })
                        }
                      />
                      <NumberInput
                        label={`${role.id} line height`}
                        min={1}
                        max={2.5}
                        step={0.05}
                        value={role.desktop.lineHeight}
                        onChange={(value) =>
                          updateRoleValue(role.id, { lineHeight: value })
                        }
                      />
                      <NumberInput
                        label={`${role.id} letter spacing`}
                        min={-2}
                        max={2}
                        step={0.05}
                        units="px"
                        value={role.desktop.letterSpacingPx}
                        onChange={(value) =>
                          updateRoleValue(role.id, { letterSpacingPx: value })
                        }
                      />
                    </div>
                  ))}
                </div>
              );
            })}

            {warnings.length > 0 && (
              <div className={styles.settingGroup}>
                <h2>Warnings</h2>
                <ul className={styles.warningList}>
                  {warnings
                    .filter((warning) => warning.status !== "pass")
                    .map((warning, index) => (
                      <li key={index} data-status={warning.status}>
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
        <section aria-label="Type scale preview" className={styles.previewPage}>
          <div
            className={styles.previewControls}
            role="group"
            aria-label="Preview options"
          >
            <div
              className={styles.previewControlGroup}
              role="group"
              aria-label="Template"
            >
              {PREVIEW_TEMPLATES.map((entry) => (
                <Button
                  key={entry.id}
                  aria-pressed={project.template === entry.id}
                  scheme="neutral"
                  size="xs"
                  variant={
                    project.template === entry.id ? "contained" : "outlined"
                  }
                  onClick={() =>
                    setProject((current) =>
                      current ? { ...current, template: entry.id } : current,
                    )
                  }
                >
                  {entry.label}
                </Button>
              ))}
            </div>
            <div
              className={styles.previewControlGroup}
              role="group"
              aria-label="Preview width"
            >
              {PREVIEW_WIDTH_OPTIONS.map((entry) => (
                <Button
                  key={entry.id}
                  aria-pressed={previewWidth === entry.id}
                  scheme="neutral"
                  size="xs"
                  variant={previewWidth === entry.id ? "contained" : "outlined"}
                  onClick={() => setPreviewWidth(entry.id)}
                >
                  {entry.label}
                </Button>
              ))}
            </div>
            <div
              className={styles.previewControlGroup}
              role="group"
              aria-label="Preview language"
            >
              {(["en", "th"] as PreviewLanguage[]).map((code) => (
                <Button
                  key={code}
                  aria-pressed={previewLang === code}
                  scheme="neutral"
                  size="xs"
                  variant={previewLang === code ? "contained" : "outlined"}
                  onClick={() => setPreviewLang(code)}
                >
                  {code === "en" ? "English" : "ไทย"}
                </Button>
              ))}
            </div>
          </div>

          <div
            className={styles.previewStage}
            style={{ maxWidth: `${PREVIEW_WIDTHS[previewWidth]}px` }}
          >
            {project.template === "article" && (
              <ArticleTemplate lang={previewLang} styleFor={styleForRole} />
            )}
            {project.template === "marketing" && (
              <MarketingTemplate lang={previewLang} styleFor={styleForRole} />
            )}
            {project.template === "specimen" &&
              rolesLargeToSmall.map((role) => {
                /* Sample copy exists for the six original roles. An arbitrary
                   role falls back to the specimen text, which is always set. */
                const sample = PREVIEW_TEXT[role.id as SemanticRole];
                const text = sample
                  ? previewLang === "th"
                    ? sample.th
                    : sample.en
                  : project.specimenText || role.name;
                const Tag = role.element as "p";

                return (
                  <article key={role.id} className={styles.previewRole}>
                    <header>
                      <h3>{role.id}</h3>
                      <p>
                        {formatLength(role.desktop.fontSizePx, project.unit)} ·
                        weight {role.fontWeight} · line height{" "}
                        {role.desktop.lineHeight} · {role.element}
                      </p>
                    </header>
                    <Tag style={styleForRole(role.id)}>{text}</Tag>
                  </article>
                );
              })}
          </div>
        </section>
      )}

      <TypographyExportDialog
        isOpen={isExportDialogOpen}
        projectName={system.name}
        system={resolvedSystem}
        unit={project.unit}
        onOpenChange={setIsExportDialogOpen}
        onUnitChange={(unit) =>
          setProject((current) => (current ? { ...current, unit } : current))
        }
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
