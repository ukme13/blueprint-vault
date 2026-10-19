import { generatePalettes } from "@blueprint/ui";
import {
  exportHandoverFiles,
  exportOutput,
  type ExportFormat,
  type ExportInput,
  type HandoverFiles,
} from "./system-export-download";

/*
 * Makes the heavy export formats off the page's thread.
 *
 * The handover archive and the accessibility reports measure every pair of
 * shades and write the result out; here they cost the page nothing while they
 * run. The same two functions the page would call, so a file made here and one
 * made there are one string.
 */

export interface ExportRequest {
  id: number;
  format: ExportFormat;
  workspace: ExportInput["workspace"];
  colourFormat: ExportInput["colourFormat"];
  unit: ExportInput["unit"];
  remRootPx: number;
}

export type ExportReply =
  | { id: number; output: string; handover: HandoverFiles }
  | { id: number; error: string };

/* The worker's scope, as far as this file uses it. The app is typed against the
   page's DOM, and the worker lib would redeclare half of it. */
const scope = self as unknown as {
  onmessage: ((event: MessageEvent<ExportRequest>) => void) | null;
  postMessage: (message: ExportReply) => void;
};

scope.onmessage = (event) => {
  const { id, format, workspace, colourFormat, unit, remRootPx } = event.data;
  try {
    /* Palettes are derived from the workspace, as the dialog derives them, so
       the page sends the project once and not the project and its shades. */
    const input: ExportInput = {
      workspace,
      palettes: workspace.palette ? generatePalettes(workspace.palette) : [],
      colourFormat,
      unit,
      remRootPx,
    };
    const handover = format === "handover" ? exportHandoverFiles(input) : [];
    const output = exportOutput(format, input, handover);
    const reply: ExportReply = { id, output, handover };
    scope.postMessage(reply);
  } catch (error) {
    const reply: ExportReply = {
      id,
      error: error instanceof Error ? error.message : String(error),
    };
    scope.postMessage(reply);
  }
};
