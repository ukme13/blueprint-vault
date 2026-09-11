import type { PaletteProjectData } from "../color/export";
import type { SemanticToken } from "../color/semantic";
import type { ButtonScheme } from "../button-tones";
import type { ElevationScale } from "../scale/elevation";
import type { RadiusScale } from "../scale/radius";
import type { SpacingScale } from "../scale/spacing";
import type { PreviewDevice } from "../typography/preview-devices";
import type { TypeScaleUnit } from "../typography/types";
import type { TypeSystem } from "../typography/system";

/** The typography half of a workspace: the system, and how it is being viewed. */
export interface TypographyProjectData {
  system: TypeSystem;
  unit: TypeScaleUnit;
  specimenText: string;
  /**
   * Which preview template the Preview section shows.
   *
   * A string here rather than a union: templates are layouts that live in the
   * app, and the engine is not meant to know what they are. Whoever renders
   * them narrows this against the list it actually has.
   */
  template: string;
  /**
   * Named frames offered in the typography preview.
   *
   * Phone, tablet and desktop are always present. A project may add up to
   * two extra desktop sizes. Older saves that stored a hide/show id list
   * gain all three required frames on read.
   */
  previewDevices: PreviewDevice[];
}

/**
 * One document for both studios.
 *
 * A slice is `null` when that studio has never been used, which is not the same
 * as it holding an empty default — a user with only a palette must still land
 * on the typography creation screen rather than a scale nobody chose.
 */
export interface WorkspaceProject {
  /** One name for the workspace. Both studios show and edit this. */
  name: string;
  palette: PaletteProjectData | null;
  typography: TypographyProjectData | null;
  /**
   * The semantic colour layer, or null when there is no palette to point at.
   *
   * Unlike the other two, this slice is seeded rather than left null when it is
   * missing: a workspace saved before semantics existed has a palette and every
   * reason to have a layer over it, and asking somebody to build eleven tokens
   * by hand to get back to where they were is not an upgrade.
   */
  semantics: SemanticToken[] | null;
  /**
   * Seed roles this workspace has deliberately thrown away.
   *
   * Part of the semantic slice rather than a slice of its own: it is only
   * meaningful beside the layer, and whoever writes one writes both.
   *
   * It exists because an absent id means two different things and the reader
   * cannot tell them apart. A role added to the seed set since the save is
   * missing and should be filled in; a role somebody deleted last week is
   * missing and should stay that way. Without this list `fillSeedRoles` gives
   * the same answer to both, and the deletion undoes itself on the next read.
   *
   * Never null, unlike the layer: an empty list and no list say the same
   * thing, and a nullable one would be three states for two facts.
   */
  removedSeedRoles: string[];
  /**
   * Which button tones this workspace still has.
   *
   * Part of the semantic slice: the Button reads these schemes, and a client
   * with no info status needs them gone so the eight roles feeding that tone
   * are no longer load-bearing. Missing on an older save is every seed
   * scheme. `primary` cannot be omitted.
   */
  buttonSchemes: ButtonScheme[];
  /**
   * The spacing scale.
   *
   * Never null once read: unlike a studio somebody has not opened, a workspace
   * without a spacing scale is one laying itself out on numbers nobody chose,
   * so a project saved before this gains the default rather than a gap.
   */
  spacing: SpacingScale;
  /** Corner radii, named for what they go on. Filled like `spacing`. */
  radius: RadiusScale;
  /** Shadow levels. Filled like the other two scales. */
  elevation: ElevationScale;
}
