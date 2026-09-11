"use client";

import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { CodeBlock } from "@astryxdesign/core/CodeBlock";
import { Dialog } from "@astryxdesign/core/Dialog";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Selector } from "@astryxdesign/core/Selector";
import { strToU8, zipSync } from "fflate";
import {
  Button,
  buildHandoverFiles,
  HANDOVER_README,
  COLOUR_FORMAT_LABELS,
  COLOUR_FORMATS,
  buildAccessibilityReport,
  formatAccessibilityReportJson,
  formatAccessibilityReportMarkdown,
  formatBlueprintWorkspace,
  formatDesignSystemCss,
  formatDesignSystemDesignTokens,
  formatDesignSystemTailwind,
  generatePalettes,
  parseBlueprintWorkspace,
  type ColourFormat,
  type WorkspaceProject,
} from "@blueprint/ui";
import { useColourFormat } from "./palette/ColourFormatContext";
import styles from "./system-export-dialog.module.css";

type ExportFormat =
  | "css"
  | "tailwind"
  | "tokens"
  | "project"
  | "report-md"
  | "report-json"
  | "handover";

const FORMATS: Array<{ value: ExportFormat; label: string }> = [
  { value: "css", label: "CSS" },
  { value: "tailwind", label: "Tailwind CSS" },
  { value: "tokens", label: "Design Tokens" },
  { value: "project", label: "Blueprint" },
  { value: "report-md", label: "Report (Markdown)" },
  { value: "report-json", label: "Report (JSON)" },
  { value: "handover", label: "Handover (.zip)" },
];

/* The report is the only format that is about the project rather than made of
   it, so it is the only one the colour-format switch does not apply to: every
   value in it is a measurement, and a ratio has no hex notation. */
const REPORT_FORMATS: ExportFormat[] = ["report-md", "report-json"];

/**
 * The studio build stamped into a handover's README.
 *
 * Written here rather than read from package.json, which a browser bundle has
 * no business importing. It is what a client quotes when something in their
 * file looks wrong, so it wants to move when the export format does rather
 * than on every patch release.
 */
const HANDOVER_VERSION = "0.1.0";

interface SystemExportDialogProps {
  isOpen: boolean;
  /** Every slice, since a project file that carried one lost the others. */
  workspace: WorkspaceProject;
  /**
   * Offered only where a studio can act on it.
   *
   * Importing replaces the whole workspace, which needs a confirmation and a
   * write the importing page owns. A studio that cannot do that gets an export
   * dialog without an import button rather than one whose button does nothing.
   */
  onImportRequest?: (project: WorkspaceProject) => void;
  onOpenChange: (isOpen: boolean) => void;
}

export function SystemExportDialog({
  isOpen,
  workspace,
  onImportRequest,
  onOpenChange,
}: SystemExportDialogProps) {
  /* Derived rather than passed. The palette is already in the workspace, and a
     second copy of it in the props is one more thing that can disagree. */
  const palettes = useMemo(
    () => (workspace.palette ? generatePalettes(workspace.palette) : []),
    [workspace.palette],
  );
  const { colourFormat: sharedColourFormat } = useColourFormat();
  const [exportFormat, setExportFormat] = useState<ExportFormat>("css");
  const [colourFormat, setColourFormat] =
    useState<ColourFormat>(sharedColourFormat);
  const [importError, setImportError] = useState("");
  const importInputRef = useRef<HTMLInputElement>(null);

  const handleOpenChange = (nextIsOpen: boolean) => {
    if (!nextIsOpen) setImportError("");
    onOpenChange(nextIsOpen);
  };

  /* Built once and read twice, so the README somebody previews is the README
     inside the archive they download rather than a second rendering of it. */
  const handover = useMemo(
    () =>
      buildHandoverFiles(workspace, {
        colourFormat,
        typeScaleUnit: workspace.typography?.unit === "rem" ? "rem" : "px",
        version: HANDOVER_VERSION,
        /* Date only. A handover exported twice in one afternoon should differ
           by its contents or not at all, and a timestamp would make every
           archive a different file for no reason a client can see. */
        exportedAt: new Date().toISOString().slice(0, 10),
      }),
    [colourFormat, workspace],
  );

  const output = useMemo(() => {
    /* Every family in every format. A semantic alias points at a primitive
       variable and a shadow sits inside the spacing around it, so a file
       carrying one of them is half a system — and a browser drops a reference
       to a variable nothing declares in silence. */
    const system = {
      palettes,
      semantics: workspace.semantics ?? [],
      spacing: workspace.spacing,
      radius: workspace.radius,
      elevation: workspace.elevation,
      colourFormat,
    };
    if (exportFormat === "tailwind") {
      return formatDesignSystemTailwind(system);
    }
    if (exportFormat === "tokens") {
      return formatDesignSystemDesignTokens(system);
    }
    if (exportFormat === "project") {
      return formatBlueprintWorkspace(workspace);
    }
    if (exportFormat === "handover") {
      /* The README rather than a file listing. It is the one file in there
         that says what the other seven are, so previewing it answers the
         question somebody opens this dialog with. */
      return (
        handover.find((file) => file.path === HANDOVER_README)?.contents ?? ""
      );
    }
    if (REPORT_FORMATS.includes(exportFormat)) {
      /* Built here rather than passed in, so the preview and the downloaded
         file are the same string by construction. The report carries no
         timestamp for the same reason: it has to be a pure function of the
         project, or the two would quietly disagree. */
      const report = buildAccessibilityReport({
        projectName: workspace.name,
        palettes,
        semantics: workspace.semantics,
        typography: workspace.typography?.system ?? null,
      });
      if (!report) return "";
      return exportFormat === "report-json"
        ? formatAccessibilityReportJson(report)
        : formatAccessibilityReportMarkdown(report);
    }
    return formatDesignSystemCss(system);
  }, [colourFormat, exportFormat, handover, palettes, workspace]);

  const extension =
    exportFormat === "handover"
      ? "zip"
      : exportFormat === "report-md"
        ? "md"
        : exportFormat === "project" ||
            exportFormat === "tokens" ||
            exportFormat === "report-json"
          ? "json"
          : "css";
  const filename = `${
    workspace.name
      .trim()
      .replace(/[^a-z0-9]+/gi, "-")
      .toLowerCase() || "blueprint-workspace"
  }${REPORT_FORMATS.includes(exportFormat) ? "-accessibility" : ""}${
    exportFormat === "handover" ? "-handover" : ""
  }.${exportFormat === "project" ? "blueprint." : ""}${extension}`;

  const downloadOutput = () => {
    /* A zip is bytes rather than a string, so it takes its own path to the
       same three lines. fflate over jszip: zero dependencies against four, one
       of which is a Node stream polyfill that would ship to the browser, and
       jszip's last release is 2022. */
    if (exportFormat === "handover") {
      const archive = zipSync(
        Object.fromEntries(
          handover.map((file) => [file.path, strToU8(file.contents)]),
        ),
        /* Level 6: a design system is text and compresses to a fraction of
           itself either way, and 9 spends time a click should not. */
        { level: 6 },
      );
      const zipUrl = URL.createObjectURL(
        new Blob([archive as BlobPart], { type: "application/zip" }),
      );
      const zipLink = document.createElement("a");
      zipLink.href = zipUrl;
      zipLink.download = filename;
      zipLink.click();
      URL.revokeObjectURL(zipUrl);
      return;
    }

    const url = URL.createObjectURL(
      new Blob([output], {
        type:
          extension === "json"
            ? "application/json"
            : extension === "md"
              ? "text/markdown"
              : "text/css",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importProject = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const importedProject = parseBlueprintWorkspace(await file.text());
      setImportError("");
      onOpenChange(false);
      onImportRequest?.(importedProject);
    } catch {
      setImportError("Choose a valid Blueprint project file.");
    }
  };

  return (
    <Dialog
      aria-label="Export palette"
      className={styles.exportDialog}
      isOpen={isOpen}
      maxHeight="82vh"
      padding={0}
      purpose="info"
      width={820}
      onOpenChange={handleOpenChange}
    >
      <header className={styles.exportDialogHeader}>
        <h2>Export palette</h2>
        <IconButton
          icon={<Icon icon="close" size="sm" />}
          label="Close export"
          size="sm"
          variant="ghost"
          onClick={() => handleOpenChange(false)}
        />
      </header>
      <div className={styles.exportDialogBody}>
        <section className={styles.exportSettings} aria-label="Export settings">
          <h3>Format</h3>
          <div className={styles.exportFormatGrid}>
            {FORMATS.map((format) => (
              <Button
                key={format.value}
                aria-pressed={exportFormat === format.value}
                scheme="neutral"
                size="small"
                variant={
                  exportFormat === format.value ? "contained" : "outlined"
                }
                onClick={() => setExportFormat(format.value)}
              >
                {format.label}
              </Button>
            ))}
          </div>
          {exportFormat !== "project" &&
            !REPORT_FORMATS.includes(exportFormat) && (
              <label className={styles.exportColourFormat}>
                <span>Colour format</span>
                <Selector
                  isLabelHidden
                  label="Export colour format"
                  options={COLOUR_FORMATS.map((format) => ({
                    label: COLOUR_FORMAT_LABELS[format],
                    value: format,
                  }))}
                  size="sm"
                  value={colourFormat}
                  width={130}
                  onChange={(value) => setColourFormat(value as ColourFormat)}
                />
              </label>
            )}
        </section>
        <section className={styles.exportPreview} aria-label="Export preview">
          <CodeBlock
            code={output}
            container="card"
            language={
              extension === "json"
                ? "json"
                : extension === "md" || extension === "zip"
                  ? "markdown"
                  : "css"
            }
            maxHeight="430px"
            hasLineNumbers
            size="sm"
            width="100%"
          />
        </section>
      </div>
      <footer className={styles.exportDialogFooter}>
        {onImportRequest && (
          <>
            <input
              ref={importInputRef}
              className={styles.visuallyHidden}
              type="file"
              accept=".json,.blueprint.json,application/json"
              onChange={importProject}
            />
            <Button
              scheme="neutral"
              size="medium"
              variant="text"
              onClick={() => importInputRef.current?.click()}
            >
              Import project
            </Button>
            {importError && (
              <span className={styles.exportImportError} role="alert">
                {importError}
              </span>
            )}
          </>
        )}
        <span className={styles.exportDialogFooterSpacer} />
        <Button
          scheme="primary"
          size="medium"
          variant="contained"
          onClick={downloadOutput}
        >
          Download
        </Button>
      </footer>
    </Dialog>
  );
}
