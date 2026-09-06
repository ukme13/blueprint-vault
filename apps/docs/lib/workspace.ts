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

/**
 * The workspace this build describes.
 *
 * The reference fixture unless `BLUEPRINT_WORKSPACE` names another file,
 * which is what makes one app able to document any client's system: `pnpm
 * handover` points it at theirs and builds the same pages against it.
 *
 * An environment variable rather than a runtime import, and that is the
 * plan's open question answered. Runtime would make the documentation a
 * tool — drop a file in, read the pages against it — and build-time makes it
 * a deliverable, a folder a client keeps that needs nothing running. A
 * deliverable is what stage 5 is for. The tool can follow if somebody asks.
 */
const REFERENCE =
  process.env.BLUEPRINT_WORKSPACE ??
  join(process.cwd(), "blueprint", "reference.workspace.json");

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
