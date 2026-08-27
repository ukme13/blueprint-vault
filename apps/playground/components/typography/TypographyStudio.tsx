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
  SEMANTIC_ROLES,
  formatLength,
  TYPE_SCALE_UNITS,
  TYPE_SCALE_RATIO_PRESETS,
  type RoleAssignment,
  type SemanticRole,
  type TypeScale,
  type TypeScaleUnit,
} from "@blueprint/ui";
import { TypographyCreation } from "./TypographyCreation";
import { TypographyExportDialog } from "./TypographyExportDialog";
import { WorkspaceNav } from "../WorkspaceNav";
import styles from "./typography-workspace.module.css";
import type { RoleStyleMap, TypographySection } from "./types";

const TYPOGRAPHY_STORAGE_KEY = "blueprint.typography-project.v1";

interface TypographyProject {
  name: string;
  fontFamily: string;
  baseFontSizePx: number;
  ratio: number;
  stepCount: number;
  roleStyles: RoleStyleMap;
  /** Output unit. Optional in storage: projects saved before units existed. */
  unit: TypeScaleUnit;
  /** Text shown at every step so a scale can be judged in real copy. */
  specimenText: string;
}

const DEFAULT_UNIT: TypeScaleUnit = "rem";
const DEFAULT_SPECIMEN_TEXT = "How vexingly quick daft zebras jump";

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
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !("name" in parsed) ||
      typeof parsed.name !== "string" ||
      !("fontFamily" in parsed) ||
      typeof parsed.fontFamily !== "string" ||
      !("baseFontSizePx" in parsed) ||
      typeof parsed.baseFontSizePx !== "number" ||
      !("ratio" in parsed) ||
      typeof parsed.ratio !== "number" ||
      !("stepCount" in parsed) ||
      typeof parsed.stepCount !== "number" ||
      !("roleStyles" in parsed) ||
      !parsed.roleStyles ||
      typeof parsed.roleStyles !== "object"
    ) {
      return null;
    }

    const steps = generateTypeSteps(
      parsed.baseFontSizePx,
      parsed.ratio,
      parsed.stepCount,
    );
    const fallbackRoleStyles = defaultRoleStyles(assignDefaultRoles(steps));
    const roleStyles = { ...fallbackRoleStyles };

    SEMANTIC_ROLES.forEach((role) => {
      const stored = (parsed.roleStyles as Record<string, unknown>)[role];
      if (
        stored &&
        typeof stored === "object" &&
        "fontWeight" in stored &&
        typeof stored.fontWeight === "number" &&
        "lineHeight" in stored &&
        typeof stored.lineHeight === "number" &&
        "letterSpacingPx" in stored &&
        typeof stored.letterSpacingPx === "number"
      ) {
        roleStyles[role] = {
          fontWeight: stored.fontWeight,
          lineHeight: stored.lineHeight,
          letterSpacingPx: stored.letterSpacingPx,
        };
      }
    });

    return {
      name: parsed.name,
      fontFamily: parsed.fontFamily,
      baseFontSizePx: parsed.baseFontSizePx,
      ratio: parsed.ratio,
      stepCount: parsed.stepCount,
      roleStyles,
      /* Defaulted rather than required: projects saved before units and
         specimen text existed must still load. */
      unit:
        "unit" in parsed &&
        TYPE_SCALE_UNITS.includes(parsed.unit as TypeScaleUnit)
          ? (parsed.unit as TypeScaleUnit)
          : DEFAULT_UNIT,
      specimenText:
        "specimenText" in parsed && typeof parsed.specimenText === "string"
          ? parsed.specimenText
          : DEFAULT_SPECIMEN_TEXT,
    };
  } catch {
    return null;
  }
}

export function TypographyStudio() {
  const [project, setProject] = useState<TypographyProject | null>(null);
  const [hasLoadedProject, setHasLoadedProject] = useState(false);
  const [activeSection, setActiveSection] =
    useState<TypographySection>("editor");
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false);
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

  const steps = useMemo(() => {
    if (!project) return [];
    return generateTypeSteps(
      project.baseFontSizePx,
      project.ratio,
      project.stepCount,
    );
  }, [project]);

  const roles = useMemo((): RoleAssignment[] => {
    if (!project) return [];
    return assignDefaultRoles(steps).map((role) => ({
      ...role,
      ...project.roleStyles[role.role],
    }));
  }, [project, steps]);

  const scale: TypeScale | null = project
    ? {
        fontFamily: project.fontFamily,
        baseFontSizePx: project.baseFontSizePx,
        ratio: project.ratio,
        steps,
        roles,
      }
    : null;

  const bodyRole = roles.find((role) => role.role === "body");
  const bodyStep =
    bodyRole && steps.find((step) => step.step === bodyRole.step);

  const warnings = project
    ? [
        bodyStep ? assessBodyFontSize(bodyStep.fontSizePx) : null,
        bodyRole ? assessLineHeight(bodyRole.lineHeight) : null,
        assessScaleGrowth(project.ratio),
        assessStepCount(project.stepCount),
        assessRoleWeights(roles),
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

  if (!project || !scale) {
    return (
      <TypographyCreation
        onCreate={({ name, fontFamily, baseFontSizePx, ratio, stepCount }) => {
          const initialSteps = generateTypeSteps(
            baseFontSizePx,
            ratio,
            stepCount,
          );
          setProject({
            name,
            fontFamily,
            baseFontSizePx,
            ratio,
            stepCount,
            roleStyles: defaultRoleStyles(assignDefaultRoles(initialSteps)),
            unit: DEFAULT_UNIT,
            specimenText: DEFAULT_SPECIMEN_TEXT,
          });
        }}
      />
    );
  }

  const updateProject = (patch: Partial<TypographyProject>) => {
    setProject((current) => (current ? { ...current, ...patch } : current));
  };

  const updateRoleStyle = (
    role: SemanticRole,
    patch: Partial<RoleStyleMap[SemanticRole]>,
  ) => {
    setProject((current) =>
      current
        ? {
            ...current,
            roleStyles: {
              ...current.roleStyles,
              [role]: { ...current.roleStyles[role], ...patch },
            },
          }
        : current,
    );
  };

  const sortedSteps = [...steps].sort(
    (first, second) => second.fontSizePx - first.fontSizePx,
  );
  const rolesLargeToSmall = SEMANTIC_ROLES.map((role) =>
    roles.find((candidate) => candidate.role === role)!,
  );

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
            onChange={(event) => updateProject({ name: event.target.value })}
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
                const stepRoles = roles.filter(
                  (role) => role.step === step.step,
                );
                return (
                  <li key={step.step} className={styles.stepRow}>
                    <span
                      className={styles.stepSample}
                      style={{
                        fontFamily: project.fontFamily,
                        fontSize: `${step.fontSizePx}px`,
                      }}
                    >
                      {project.specimenText || "Ag"}
                    </span>
                    <span className={styles.stepMeta}>
                      <code>{formatLength(step.fontSizePx, project.unit)}</code>
                      {step.isBase && <small>base</small>}
                      {stepRoles.map((role) => (
                        <small key={role.role}>{role.role}</small>
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
              <TextInput
                label="Font family"
                value={project.fontFamily}
                onChange={(value) => updateProject({ fontFamily: value })}
              />
              <NumberInput
                label="Base font size"
                min={MIN_BASE_FONT_SIZE_PX}
                max={MAX_BASE_FONT_SIZE_PX}
                units="px"
                value={project.baseFontSizePx}
                onChange={(value) => updateProject({ baseFontSizePx: value })}
              />
              <Selector
                label="Scale ratio"
                options={[
                  ...TYPE_SCALE_RATIO_PRESETS.map((preset) => ({
                    label: `${preset.name} (${preset.ratio})`,
                    value: String(preset.ratio),
                  })),
                ]}
                value={String(project.ratio)}
                onChange={(value) => updateProject({ ratio: Number(value) })}
              />
              <NumberInput
                isIntegerOnly
                label="Number of steps"
                min={MIN_STEP_COUNT}
                max={MAX_STEP_COUNT}
                value={project.stepCount}
                onChange={(value) => updateProject({ stepCount: value })}
              />
            </div>

            <div className={styles.settingGroup}>
              <h2>Semantic roles</h2>
              {rolesLargeToSmall.map((role) => (
                <div key={role.role} className={styles.roleSetting}>
                  <span className={styles.roleSettingLabel}>{role.role}</span>
                  <NumberInput
                    isIntegerOnly
                    isLabelHidden
                    label={`${role.role} font weight`}
                    min={100}
                    max={900}
                    step={100}
                    value={role.fontWeight}
                    onChange={(value) =>
                      updateRoleStyle(role.role, { fontWeight: value })
                    }
                  />
                  <NumberInput
                    isLabelHidden
                    label={`${role.role} line height`}
                    min={1}
                    max={2.5}
                    step={0.05}
                    value={role.lineHeight}
                    onChange={(value) =>
                      updateRoleStyle(role.role, { lineHeight: value })
                    }
                  />
                  <NumberInput
                    isLabelHidden
                    label={`${role.role} letter spacing`}
                    min={-2}
                    max={2}
                    step={0.05}
                    units="px"
                    value={role.letterSpacingPx}
                    onChange={(value) =>
                      updateRoleStyle(role.role, { letterSpacingPx: value })
                    }
                  />
                </div>
              ))}
            </div>

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
          {rolesLargeToSmall.map((role) => {
            const step = steps.find(
              (candidate) => candidate.step === role.step,
            )!;
            const text = PREVIEW_TEXT[role.role];
            const style: CSSProperties = {
              fontFamily: project.fontFamily,
              fontSize: `${step.fontSizePx}px`,
              fontWeight: role.fontWeight,
              lineHeight: role.lineHeight,
              letterSpacing: `${role.letterSpacingPx}px`,
            };
            const Tag =
              role.role === "display" || role.role === "heading"
                ? "h1"
                : role.role === "title"
                  ? "h2"
                  : role.role === "body"
                    ? "p"
                    : role.role === "label"
                      ? "label"
                      : "small";

            return (
              <article key={role.role} className={styles.previewRole}>
                <header>
                  <h3>{role.role}</h3>
                  <p>
                    {step.fontSizePx.toFixed(1)}px · weight {role.fontWeight} ·
                    line height {role.lineHeight}
                  </p>
                </header>
                <Tag style={style}>{text.en}</Tag>
                <Tag style={style} lang="th">
                  {text.th}
                </Tag>
              </article>
            );
          })}
        </section>
      )}

      <TypographyExportDialog
        isOpen={isExportDialogOpen}
        projectName={project.name}
        scale={scale}
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
