import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  generatePalettes,
  parseBlueprintWorkspace,
  type ColorTrack,
  type WorkspaceProject,
} from "@blueprint/ui";

/**
 * The workspace this documentation describes, read at build time.
 *
 * Server-side and nothing else: the pages are static, so this runs once when
 * `next build` renders them and never in a browser. That is the arrangement
 * the plan asks for and it is worth naming why — a documentation site that
 * fetched and parsed its own tokens at runtime would be describing a system
 * nobody had checked, and would need the file served as an asset to do it.
 *
 * `parseBlueprintWorkspace` rather than `JSON.parse`, because the parse is the
 * step a client's file goes through: it refuses a version this build cannot
 * open and fills a slice an older file lacks. A page rendered from a raw parse
 * would describe a workspace the studio itself would read differently.
 *
 * The file is a fixture and is meant to be replaceable. Nothing here or in the
 * pages may depend on its values.
 *
 * See docs/roadmap/foundations-handover.md.
 */

const REFERENCE = join(process.cwd(), "blueprint", "reference.workspace.json");

export interface ReferenceWorkspace {
  project: WorkspaceProject;
  /** The palette generated from the project's tracks, resolved once. */
  palettes: ColorTrack[];
}

export function readReferenceWorkspace(): ReferenceWorkspace {
  const project = parseBlueprintWorkspace(readFileSync(REFERENCE, "utf8"));
  return {
    project,
    palettes: project.palette ? generatePalettes(project.palette) : [],
  };
}
