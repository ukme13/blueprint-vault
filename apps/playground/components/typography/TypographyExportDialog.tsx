"use client";

import { useMemo, useState } from "react";
import { CodeBlock } from "@astryxdesign/core/CodeBlock";
import { Dialog } from "@astryxdesign/core/Dialog";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import {
  Button,
  formatTypeSystemCssExport,
  formatTypeSystemTailwindExport,
  TYPE_SCALE_UNITS,
  type TypeSystem,
  type TypeScaleUnit,
  localSlots,
} from "@blueprint/ui";
import styles from "./typography-workspace.module.css";

type ExportFormat = "css" | "tailwind";

const FORMATS: Array<{ value: ExportFormat; label: string }> = [
  { value: "css", label: "CSS" },
  { value: "tailwind", label: "Tailwind CSS" },
];

const UNIT_LABELS: Record<TypeScaleUnit, string> = {
  rem: "rem",
  px: "px",
  pt: "pt",
};

interface TypographyExportDialogProps {
  isOpen: boolean;
  projectName: string;
  system: TypeSystem;
  unit: TypeScaleUnit;
  onOpenChange: (isOpen: boolean) => void;
  onUnitChange: (unit: TypeScaleUnit) => void;
}

export function TypographyExportDialog({
  isOpen,
  projectName,
  system,
  unit,
  onOpenChange,
  onUnitChange,
}: TypographyExportDialogProps) {
  const [exportFormat, setExportFormat] = useState<ExportFormat>("css");

  /* Only the entries actually backed by a file. A Google or system family is
     the reader's to load and carries no licence question of ours. */
  const localFamilies = localSlots(system).map(({ family }) => family);

  const output = useMemo(
    () =>
      exportFormat === "tailwind"
        ? formatTypeSystemTailwindExport(system, unit)
        : formatTypeSystemCssExport(system, unit),
    [exportFormat, system, unit],
  );

  const filename = `${
    projectName
      .trim()
      .replace(/[^a-z0-9]+/gi, "-")
      .toLowerCase() || "blueprint-typography"
  }.css`;

  const downloadOutput = () => {
    const url = URL.createObjectURL(new Blob([output], { type: "text/css" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return (
    <Dialog
      aria-label="Export type scale"
      className={styles.exportDialog}
      isOpen={isOpen}
      maxHeight="82vh"
      padding={0}
      purpose="info"
      width={820}
      onOpenChange={onOpenChange}
    >
      <header className={styles.exportDialogHeader}>
        <h2>Export type scale</h2>
        <IconButton
          icon={<Icon icon="close" size="sm" />}
          label="Close export"
          size="sm"
          variant="ghost"
          onClick={() => onOpenChange(false)}
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
          <h3>Unit</h3>
          <div className={styles.exportFormatGrid}>
            {TYPE_SCALE_UNITS.map((value) => (
              <Button
                key={value}
                aria-pressed={unit === value}
                scheme="neutral"
                size="small"
                variant={unit === value ? "contained" : "outlined"}
                onClick={() => onUnitChange(value)}
              >
                {UNIT_LABELS[value]}
              </Button>
            ))}
          </div>
          <p className={styles.exportUnitHint}>
            rem scales with the reader&rsquo;s browser font-size setting. px and
            pt do not.
          </p>
          {localFamilies.length > 0 && (
            /* Said here as well as where the file was added, because this is
               the moment someone is about to ship it. */
            <p className={styles.exportLicenceNote}>
              This export names {localFamilies.join(", ")} and does not include
              {localFamilies.length > 1 ? " those files" : " the file"}. Whoever
              uses it needs the font too — check your licence covers the web,
              which a desktop one often does not.
            </p>
          )}
        </section>
        <section className={styles.exportPreview} aria-label="Export preview">
          <CodeBlock
            code={output}
            container="card"
            language="css"
            maxHeight="430px"
            hasLineNumbers
            size="sm"
            width="100%"
          />
        </section>
      </div>
      <footer className={styles.exportDialogFooter}>
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
