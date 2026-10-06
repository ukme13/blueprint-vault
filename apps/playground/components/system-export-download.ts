import { strToU8, zipSync } from "fflate";
import {
  buildAccessibilityReport,
  buildHandoverFiles,
  formatAccessibilityReportJson,
  formatAccessibilityReportMarkdown,
  formatBlueprintWorkspace,
  formatDesignSystemCss,
  formatDesignSystemDesignTokens,
  formatDesignSystemTailwind,
  HANDOVER_README,
  type ColourFormat,
  type generatePalettes,
  type TypeScaleUnit,
  type WorkspaceProject,
} from "@blueprint/ui";
import { STUDIO_VERSION } from "../lib/studio-version";

/*
 * What the export dialog writes and how it reaches the reader's disk: the
 * formats, the text of each, its filename, and the download itself. The
 * dialog keeps the choices and renders them.
 */

export type ExportFormat =
  | "css"
  | "tailwind"
  | "tokens"
  | "project"
  | "report-md"
  | "report-json"
  | "handover";

export const FORMATS: Array<{ value: ExportFormat; label: string }> = [
  { value: "css", label: "CSS" },
  { value: "tailwind", label: "Tailwind CSS" },
  { value: "tokens", label: "Design Tokens" },
  { value: "project", label: "Blueprint" },
  { value: "report-md", label: "Report" },
  { value: "report-json", label: "Report (JSON)" },
  { value: "handover", label: "Handover (.zip)" },
];

/* The report is the only format that is about the project rather than made of
   it, so it is the only one the colour-format switch does not apply to: every
   value in it is a measurement, and a ratio has no hex notation. */
export const REPORT_FORMATS: ExportFormat[] = ["report-md", "report-json"];

/* The formats a type scale is written into, and so the ones a unit applies
   to. The project file keeps the unit as a preference rather than applying
   it, and the report measures. */
export const TYPE_FORMATS: ExportFormat[] = [
  "css",
  "tailwind",
  "tokens",
  "handover",
];

export type ExportExtension = "zip" | "md" | "json" | "css";

type HandoverFiles = ReturnType<typeof buildHandoverFiles>;

export interface ExportInput {
  workspace: WorkspaceProject;
  palettes: ReturnType<typeof generatePalettes>;
  colourFormat: ColourFormat;
  unit: TypeScaleUnit;
  remRootPx: number;
}

/** The studio version stamped into a handover's README, which is what a client
    quotes when something in their file looks wrong. */
const HANDOVER_VERSION = STUDIO_VERSION;

/**
 * The handover archive's files. Built once by the dialog and read twice, so
 * the README somebody previews is the README inside the archive they
 * download rather than a second rendering of it.
 */
export function exportHandoverFiles({
  workspace,
  colourFormat,
  unit,
  remRootPx,
}: Omit<ExportInput, "palettes">): HandoverFiles {
  const typography = workspace.typography;
  return buildHandoverFiles(
    typography
      ? { ...workspace, typography: { ...typography, unit, remRootPx } }
      : workspace,
    {
      colourFormat,
      /* A handover's typography file is rem or px; pt is for print, and the
         px it is converted from is what a screen reads. */
      typeScaleUnit: unit === "rem" ? "rem" : "px",
      version: HANDOVER_VERSION,
      /* Date only. A handover exported twice in one afternoon should differ
         by its contents or not at all, and a timestamp would make every
         archive a different file for no reason a client can see. */
      exportedAt: new Date().toISOString().slice(0, 10),
    },
  );
}

/** The text of one format: what the preview shows and the file holds. */
export function exportOutput(
  format: ExportFormat,
  input: ExportInput,
  handover: HandoverFiles,
): string {
  const { workspace, palettes, colourFormat, unit, remRootPx } = input;
  const typography = workspace.typography;
  /* Every family in every format. A semantic alias points at a primitive
     variable, a use at a spacing step, and a shadow sits inside the spacing
     around it, so a file carrying one of them is half a system — and a
     browser drops a reference to a variable nothing declares in silence. */
  const system = {
    palettes,
    semantics: workspace.semantics ?? [],
    spacing: workspace.spacing,
    radius: workspace.radius,
    elevation: workspace.elevation,
    colourFormat,
    layout: workspace.layout,
    previewDevices: workspace.previewDevices,
    typography: typography
      ? { system: typography.system, unit, remRootPx }
      : null,
  };
  if (format === "tailwind") return formatDesignSystemTailwind(system);
  if (format === "tokens") return formatDesignSystemDesignTokens(system);
  if (format === "project") return formatBlueprintWorkspace(workspace);
  if (format === "handover") {
    /* The README rather than a file listing. It is the one file in there
       that says what the other seven are, so previewing it answers the
       question somebody opens this dialog with. */
    return (
      handover.find((file) => file.path === HANDOVER_README)?.contents ?? ""
    );
  }
  if (REPORT_FORMATS.includes(format)) {
    /* Built here rather than passed in, so the preview and the downloaded
       file are the same string by construction. The report carries no
       timestamp for the same reason: it has to be a pure function of the
       project, or the two would quietly disagree. */
    const report = buildAccessibilityReport({
      projectName: workspace.name,
      palettes,
      semantics: workspace.semantics,
      typography: typography?.system ?? null,
    });
    if (!report) return "";
    return format === "report-json"
      ? formatAccessibilityReportJson(report)
      : formatAccessibilityReportMarkdown(report);
  }
  return formatDesignSystemCss(system);
}

export function exportExtension(format: ExportFormat): ExportExtension {
  if (format === "handover") return "zip";
  if (format === "report-md") return "md";
  if (format === "project" || format === "tokens" || format === "report-json")
    return "json";
  return "css";
}

export function exportFilename(
  projectName: string,
  format: ExportFormat,
): string {
  const base =
    projectName
      .trim()
      .replace(/[^a-z0-9]+/gi, "-")
      .toLowerCase() || "blueprint-workspace";
  const suffix = REPORT_FORMATS.includes(format)
    ? "-accessibility"
    : format === "handover"
      ? "-handover"
      : "";
  const project = format === "project" ? "blueprint." : "";
  return `${base}${suffix}.${project}${exportExtension(format)}`;
}

const MIME_TYPES: Record<Exclude<ExportExtension, "zip">, string> = {
  json: "application/json",
  md: "text/markdown",
  css: "text/css",
};

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Save one format to disk. A zip is bytes rather than a string, so it takes
 * its own path to the same three lines. fflate over jszip: zero dependencies
 * against four, one of which is a Node stream polyfill that would ship to the
 * browser, and jszip's last release is 2022.
 */
export function downloadExport(
  format: ExportFormat,
  filename: string,
  output: string,
  handover: HandoverFiles,
): void {
  const extension = exportExtension(format);
  if (extension === "zip") {
    const archive = zipSync(
      Object.fromEntries(
        handover.map((file) => [file.path, strToU8(file.contents)]),
      ),
      /* Level 6: a design system is text and compresses to a fraction of
         itself either way, and 9 spends time a click should not. */
      { level: 6 },
    );
    saveBlob(
      new Blob([archive as BlobPart], { type: "application/zip" }),
      filename,
    );
    return;
  }
  saveBlob(new Blob([output], { type: MIME_TYPES[extension] }), filename);
}
