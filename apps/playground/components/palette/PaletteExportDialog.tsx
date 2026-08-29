"use client";

import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { CodeBlock } from "@astryxdesign/core/CodeBlock";
import { Dialog } from "@astryxdesign/core/Dialog";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Selector } from "@astryxdesign/core/Selector";
import {
  Button,
  COLOUR_FORMAT_LABELS,
  COLOUR_FORMATS,
  formatBlueprintWorkspace,
  formatPaletteCssExport,
  formatPaletteDesignTokens,
  formatPaletteTailwindExport,
  parseBlueprintWorkspace,
  type ColorTrack,
  type ColourFormat,
  type PaletteProjectData,
  type WorkspaceProject,
} from "@blueprint/ui";
import { useColourFormat } from "./ColourFormatContext";
import styles from "./palette-workspace.module.css";

type ExportFormat = "css" | "tailwind" | "tokens" | "project";

const FORMATS: Array<{ value: ExportFormat; label: string }> = [
  { value: "css", label: "CSS" },
  { value: "tailwind", label: "Tailwind CSS" },
  { value: "tokens", label: "Design Tokens" },
  { value: "project", label: "Blueprint Workspace" },
];

interface PaletteExportDialogProps {
  isOpen: boolean;
  palettes: ColorTrack[];
  project: PaletteProjectData;
  /** Both halves, since a project file that carried one lost the other. */
  workspace: WorkspaceProject;
  onImportRequest: (project: WorkspaceProject) => void;
  onOpenChange: (isOpen: boolean) => void;
}

export function PaletteExportDialog({
  isOpen,
  palettes,
  project,
  workspace,
  onImportRequest,
  onOpenChange,
}: PaletteExportDialogProps) {
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

  const output = useMemo(() => {
    if (exportFormat === "tailwind") {
      return formatPaletteTailwindExport(palettes, colourFormat);
    }
    if (exportFormat === "tokens") {
      return formatPaletteDesignTokens(palettes, colourFormat);
    }
    if (exportFormat === "project") {
      return formatBlueprintWorkspace(workspace);
    }
    return formatPaletteCssExport(palettes, colourFormat);
  }, [colourFormat, exportFormat, palettes, workspace]);

  const extension =
    exportFormat === "project" || exportFormat === "tokens" ? "json" : "css";
  const filename = `${
    project.name
      .trim()
      .replace(/[^a-z0-9]+/gi, "-")
      .toLowerCase() || "blueprint-workspace"
  }.${exportFormat === "project" ? "blueprint." : ""}${extension}`;

  const downloadOutput = () => {
    const url = URL.createObjectURL(
      new Blob([output], {
        type: extension === "json" ? "application/json" : "text/css",
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
      onImportRequest(importedProject);
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
          {exportFormat !== "project" && (
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
            language={extension === "json" ? "json" : "css"}
            maxHeight="430px"
            hasLineNumbers
            size="sm"
            width="100%"
          />
        </section>
      </div>
      <footer className={styles.exportDialogFooter}>
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
