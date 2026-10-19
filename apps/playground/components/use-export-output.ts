"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import {
  exportHandoverFiles,
  exportOutput,
  isHeavyExport,
  type ExportFormat,
  type ExportInput,
  type HandoverFiles,
} from "./system-export-download";

const NO_FILES: HandoverFiles = [];

interface Computed {
  input: ExportInput;
  output: string;
  handover: HandoverFiles;
}

/** Whether a result was made from what the dialog now holds. */
function isCurrent(computed: Computed, input: ExportInput): boolean {
  return (
    computed.input.workspace === input.workspace &&
    computed.input.palettes === input.palettes &&
    computed.input.colourFormat === input.colourFormat &&
    computed.input.unit === input.unit &&
    computed.input.remRootPx === input.remRootPx
  );
}

/**
 * The text of the chosen export, and the handover archive's files when that is
 * the one chosen.
 *
 * The plain formats are a pass over the tokens and are made as the dialog
 * renders. The handover archive and the accessibility reports measure every
 * pair of shades, and that used to run for all of them whenever the dialog
 * mounted or a format changed. They are made only when chosen, a tick after
 * the dialog has painted its loading state, so the page can still be
 * answered (the dialog closed, another tab chosen) while one is on its way. A
 * result is kept per format, so going back to one is not a second wait.
 *
 * Nothing is made while the dialog is closed.
 */
export function useExportOutput(
  format: ExportFormat,
  input: ExportInput,
  isEnabled: boolean,
): { output: string; handover: HandoverFiles; isPending: boolean } {
  const isHeavy = isHeavyExport(format);
  const { workspace, palettes, colourFormat, unit, remRootPx } = input;

  const light = useMemo(
    () =>
      isEnabled && !isHeavy
        ? exportOutput(
            format,
            { workspace, palettes, colourFormat, unit, remRootPx },
            NO_FILES,
          )
        : "",
    [
      colourFormat,
      format,
      isEnabled,
      isHeavy,
      palettes,
      remRootPx,
      unit,
      workspace,
    ],
  );

  const [computed, setComputed] = useState<
    Partial<Record<ExportFormat, Computed>>
  >({});
  const own = computed[format];
  const isFresh = own !== undefined && isCurrent(own, input);

  useEffect(() => {
    if (!isEnabled || !isHeavy || isFresh) return;
    const forInput: ExportInput = {
      workspace,
      palettes,
      colourFormat,
      unit,
      remRootPx,
    };
    /* After the loading state has been painted, and not at all if the dialog
       is closed or the choice changes before it runs. */
    const timer = window.setTimeout(() => {
      const handover =
        format === "handover" ? exportHandoverFiles(forInput) : NO_FILES;
      const output = exportOutput(format, forInput, handover);
      startTransition(() =>
        setComputed((previous) => ({
          ...previous,
          [format]: { input: forInput, output, handover },
        })),
      );
    }, 0);
    return () => window.clearTimeout(timer);
  }, [
    colourFormat,
    format,
    isEnabled,
    isFresh,
    isHeavy,
    palettes,
    remRootPx,
    unit,
    workspace,
  ]);

  if (!isHeavy) return { output: light, handover: NO_FILES, isPending: false };
  return {
    output: isFresh ? own.output : "",
    handover: isFresh ? own.handover : NO_FILES,
    isPending: isEnabled && !isFresh,
  };
}
