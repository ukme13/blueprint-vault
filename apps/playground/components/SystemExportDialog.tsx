"use client";

import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { CodeBlock } from "@astryxdesign/core/CodeBlock";
import { Dialog } from "@astryxdesign/core/Dialog";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { useIsPhone } from "./use-is-phone";
import {
  Button,
  generatePalettes,
  parseBlueprintWorkspace,
  type ColourFormat,
  type WorkspaceProject,
} from "@blueprint/ui";
import { useColourFormat } from "./palette/ColourFormatContext";
import styles from "./system-export-dialog.module.css";
import {
  ExportOptions,
  useExportTypeUnit,
  type TypePreference,
} from "./ExportOptions";
import {
  downloadExport,
  exportExtension,
  exportFilename,
  exportHandoverFiles,
  exportOutput,
  FORMATS,
  REPORT_FORMATS,
  TYPE_FORMATS,
  type ExportFormat,
} from "./system-export-download";

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
  /**
   * Saves the type unit and rem root chosen here as the project's own.
   *
   * Typography passes it: the unit is that studio's preference, and the
   * dialog is where it is set. Elsewhere the choice lasts while the dialog is
   * open, rather than changing a studio somebody is not looking at.
   */
  onTypographyPreferenceChange?: (patch: TypePreference) => void;
  onOpenChange: (isOpen: boolean) => void;
}

export function SystemExportDialog({
  isOpen,
  workspace,
  onImportRequest,
  onTypographyPreferenceChange,
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
  const typeUnit = useExportTypeUnit(
    workspace.typography,
    onTypographyPreferenceChange,
  );
  const { unit, remRootPx } = typeUnit;

  const handleOpenChange = (nextIsOpen: boolean) => {
    if (!nextIsOpen) {
      setImportError("");
      typeUnit.reset();
    }
    onOpenChange(nextIsOpen);
  };

  const handover = useMemo(
    () => exportHandoverFiles({ workspace, colourFormat, unit, remRootPx }),
    [colourFormat, remRootPx, unit, workspace],
  );
  const output = useMemo(
    () =>
      exportOutput(
        exportFormat,
        { workspace, palettes, colourFormat, unit, remRootPx },
        handover,
      ),
    [
      colourFormat,
      exportFormat,
      handover,
      palettes,
      remRootPx,
      unit,
      workspace,
    ],
  );
  const extension = exportExtension(exportFormat);
  const filename = exportFilename(workspace.name, exportFormat);

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

  /* On a phone the code is capped by the screen, so it fits between the
     formats and Download. At 430px it was taller than the room it had and its
     bottom slid under the footer. */
  const isPhone = useIsPhone();

  return (
    <Dialog
      aria-label="Export design system"
      className={styles.exportDialog}
      isOpen={isOpen}
      maxHeight="82vh"
      padding={0}
      purpose="info"
      width={820}
      onOpenChange={handleOpenChange}
    >
      <header className={styles.exportDialogHeader}>
        <h2>Export design system</h2>
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
          <h3 id="export-format-label">Format</h3>
          <div
            aria-labelledby="export-format-label"
            className={styles.exportFormatGrid}
            role="group"
          >
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
          <ExportOptions
            colourFormat={colourFormat}
            showsColourFormat={
              exportFormat !== "project" &&
              !REPORT_FORMATS.includes(exportFormat)
            }
            type={TYPE_FORMATS.includes(exportFormat) ? typeUnit.options : null}
            onColourFormatChange={setColourFormat}
          />
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
            maxHeight={isPhone ? "40dvh" : "430px"}
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
            {/* Not on a phone: a file picker is the desktop's way in. */}
            <Button
              className={styles.exportImport}
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
          className={styles.exportDownload}
          scheme="primary"
          size="medium"
          variant="contained"
          onClick={() =>
            downloadExport(exportFormat, filename, output, handover)
          }
        >
          Download
        </Button>
      </footer>
    </Dialog>
  );
}
