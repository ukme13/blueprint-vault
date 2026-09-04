import { generatePalettes } from "../color/palette";
import { parseBlueprintWorkspace } from "../workspace/workspace-file";
import type { WorkspaceProject } from "../workspace/types";
import {
  formatDesignSystemCss,
  formatDesignSystemDesignTokens,
  formatDesignSystemTailwind,
} from "./design-system-export";
import { formatTypeSystemCssExport } from "../typography/system-export";

/**
 * A whole workspace as the set of files somebody installs.
 *
 * The formatters each answer "what does this family look like in this
 * format". This answers the question above them: given a saved workspace,
 * what does a client actually receive, under what names. That is a rule with
 * real content — which formatters run, what they are passed, and that
 * typography ships beside the rest rather than inside it — and it was about
 * to exist twice, in the docs app's build script and again in the test that
 * checks the build script. Two copies of it is a test that passes while the
 * build is wrong.
 *
 * Deterministic and pure: the same workspace file gives the same bytes, which
 * is what lets the output be committed and compared rather than regenerated
 * and trusted.
 *
 * See docs/roadmap/foundations-handover.md.
 */

/** The unit the CSS is written in. A client's choice; there is no default. */
export type DesignSystemFilesOptions = {
  /**
   * Typography's unit.
   *
   * Its own option because `formatDesignSystemCss` deliberately leaves
   * typography out — the unit is a decision, and folding it in would make it
   * on the reader's behalf. Whoever asks for the files makes it instead.
   */
  typeScaleUnit: "px" | "rem";
};

/** Filenames are part of the contract: a client links against these. */
export const DESIGN_SYSTEM_FILE_NAMES = [
  "blueprint.css",
  "blueprint-typography.css",
  "blueprint.tailwind.css",
  "blueprint.tokens.json",
] as const;

export type DesignSystemFileName = (typeof DESIGN_SYSTEM_FILE_NAMES)[number];

export function designSystemFiles(
  project: WorkspaceProject,
  options: DesignSystemFilesOptions,
): Record<DesignSystemFileName, string> {
  const palettes = project.palette ? generatePalettes(project.palette) : [];

  /* The same shape the studio's export dialog builds. A semantic alias points
     at a primitive variable and a shadow sits inside the spacing around it, so
     a file carrying one family without the others is half a system — and a
     browser drops a reference to a variable nothing declares in silence. */
  const system = {
    palettes,
    semantics: project.semantics ?? [],
    spacing: project.spacing,
    radius: project.radius,
    elevation: project.elevation,
    /* hex, which is what the studio opens on and what the widest set of tools
       reads. The values are OKLCH-derived either way: this is the notation,
       not the colour. */
    colourFormat: "hex" as const,
  };

  return {
    "blueprint.css": formatDesignSystemCss(system),
    "blueprint-typography.css": project.typography
      ? formatTypeSystemCssExport(
          project.typography.system,
          options.typeScaleUnit,
        )
      : "",
    "blueprint.tailwind.css": formatDesignSystemTailwind(system),
    "blueprint.tokens.json": formatDesignSystemDesignTokens(system),
  };
}

/**
 * The same, from the bytes of a saved workspace file.
 *
 * The parse is included on purpose: it is the step a client's file goes
 * through, so a build that reads a file the parser would reject fails where
 * somebody can see it.
 */
export function designSystemFilesFromWorkspaceFile(
  workspaceFile: string,
  options: DesignSystemFilesOptions,
): Record<DesignSystemFileName, string> {
  return designSystemFiles(parseBlueprintWorkspace(workspaceFile), options);
}
