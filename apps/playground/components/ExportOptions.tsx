"use client";

import { useState } from "react";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import {
  Button,
  clampRemRootPx,
  COLOUR_FORMAT_LABELS,
  COLOUR_FORMATS,
  MAX_REM_ROOT_PX,
  MIN_REM_ROOT_PX,
  ROOT_FONT_SIZE_PX,
  TYPE_SCALE_UNITS,
  localSlots,
  type ColourFormat,
  type TypeScaleUnit,
  type WorkspaceProject,
} from "@blueprint/ui";
import { SheetSelector } from "./SheetSelector";
import styles from "./system-export-dialog.module.css";

export interface ExportTypeOptions {
  unit: TypeScaleUnit;
  remRootPx: number;
  /** Families backed by an uploaded file, which the export names only. */
  localFamilies: readonly string[];
  onUnitChange: (unit: TypeScaleUnit) => void;
  onRemRootChange: (remRootPx: number) => void;
}

export type TypePreference = { unit?: TypeScaleUnit; remRootPx?: number };

/**
 * The unit and rem root the export is written in. With `onSave` the choice is
 * the project's own and goes straight to it; without, it is held here until
 * `reset`, so the dialog does not change a studio nobody is looking at.
 */
export function useExportTypeUnit(
  typography: WorkspaceProject["typography"],
  onSave?: (patch: TypePreference) => void,
) {
  /* A choice made here and not saved; empty follows the project. */
  const [choice, setChoice] = useState<TypePreference>({});
  const unit: TypeScaleUnit = choice.unit ?? typography?.unit ?? "rem";
  const remRootPx =
    choice.remRootPx ?? typography?.remRootPx ?? ROOT_FONT_SIZE_PX;
  const choose = (patch: TypePreference) => {
    if (onSave) onSave(patch);
    else setChoice((current) => ({ ...current, ...patch }));
  };
  const options: ExportTypeOptions | null = typography
    ? {
        unit,
        remRootPx,
        localFamilies: localSlots(typography.system).map(
          ({ family }) => family,
        ),
        onUnitChange: (next) => choose({ unit: next }),
        onRemRootChange: (next) => choose({ remRootPx: next }),
      }
    : null;
  return { unit, remRootPx, options, reset: () => setChoice({}) };
}

interface ExportOptionsProps {
  colourFormat: ColourFormat;
  onColourFormatChange: (format: ColourFormat) => void;
  /** False for the formats a colour has no notation in. */
  showsColourFormat: boolean;
  /** Null when the format carries no type scale, or there is none. */
  type: ExportTypeOptions | null;
}

/**
 * What the chosen format is written in: a colour notation and, when the file
 * carries typography, a unit. Separate from the Format group, so that group
 * stays the list of things to download.
 */
export function ExportOptions({
  colourFormat,
  onColourFormatChange,
  showsColourFormat,
  type,
}: ExportOptionsProps) {
  return (
    <>
      {showsColourFormat && (
        <label className={styles.exportColourFormat}>
          <span>Colour format</span>
          <SheetSelector
            isLabelHidden
            label="Export colour format"
            options={COLOUR_FORMATS.map((format) => ({
              label: COLOUR_FORMAT_LABELS[format],
              value: format,
            }))}
            size="sm"
            value={colourFormat}
            width={130}
            onChange={(value) => onColourFormatChange(value as ColourFormat)}
          />
        </label>
      )}
      {type && <TypeUnitOptions {...type} />}
    </>
  );
}

function TypeUnitOptions({
  unit,
  remRootPx,
  localFamilies,
  onUnitChange,
  onRemRootChange,
}: ExportTypeOptions) {
  return (
    <>
      <h3 id="export-type-unit-label">Type unit</h3>
      <div
        aria-labelledby="export-type-unit-label"
        className="flex gap-2"
        role="group"
      >
        {TYPE_SCALE_UNITS.map((value) => (
          <Button
            key={value}
            aria-pressed={unit === value}
            scheme="neutral"
            size="small"
            variant={unit === value ? "contained" : "outlined"}
            onClick={() => onUnitChange(value)}
          >
            {value}
          </Button>
        ))}
      </div>
      {unit === "rem" && (
        <NumberInput
          isIntegerOnly
          isWheelEnabled={false}
          label="rem root"
          labelTooltip="The html font-size rem divides by. Default 16. The file names this as a comment when it is not 16; it does not set html { font-size }."
          max={MAX_REM_ROOT_PX}
          min={MIN_REM_ROOT_PX}
          size="sm"
          units="px"
          value={remRootPx}
          width="100%"
          onChange={(value) => onRemRootChange(clampRemRootPx(value))}
        />
      )}
      <p className="m-0 text-xs text-fg-muted">
        {unit === "rem" && remRootPx !== ROOT_FONT_SIZE_PX
          ? `These rem values assume a ${remRootPx}px root. They still scale with the reader's browser font-size if that root is not forced on html.`
          : "rem scales with the reader's browser font-size setting. px and pt do not."}
      </p>
      {localFamilies.length > 0 && (
        /* Said here as well as where the file was added, because this is the
           moment someone is about to ship it. */
        <p className="m-0 text-xs text-status-warning">
          This export names {localFamilies.join(", ")} and does not include
          {localFamilies.length > 1 ? " those files" : " the file"}. Whoever
          uses it needs the font too — check your licence covers the web, which
          a desktop one often does not.
        </p>
      )}
    </>
  );
}
