import type { PaletteProjectData } from "../color/export";
import type { SemanticToken } from "../color/semantic";
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
}
