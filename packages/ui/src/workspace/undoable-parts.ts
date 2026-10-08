import type { WorkspaceProject } from "./types";

/**
 * The semantic layer as an undo compares it: a reference with an alpha of 1
 * is the same colour as one with none.
 *
 * Both mean opaque, and some write paths spell it one way and some the other,
 * so the layer written back after leaving the Semantics tab differed from the
 * one before it by `alpha: 1` on a token nobody had touched. That counted as
 * an edit and took a step, so the first undo after leaving did nothing that
 * could be seen, and now that an undo goes to where its edit was made, it
 * would have taken the person to the Semantics tab to show nothing.
 */
function comparableSemantics(
  semantics: WorkspaceProject["semantics"],
): unknown {
  return JSON.parse(
    JSON.stringify(semantics, (key, value) =>
      key === "alpha" && value === 1 ? undefined : value,
    ),
  );
}

/**
 * The parts of a document an undo owns.
 *
 * The type system (not its name, which is the workspace's, nor the preview
 * text and settings beside it in the same slice), the scales and the layout
 * uses that point at them, the device ratios the system's own mirrors, and the
 * semantic layer with what goes with it. The palette, the name and the view
 * settings are not here.
 */
export function undoableParts(project: WorkspaceProject) {
  /* Without its name: the workspace's name is mirrored into the system, so a
     rename would otherwise read as an edit of the type scale. */
  const system = project.typography?.system;
  return {
    typographySystem: system ? { ...system, name: undefined } : null,
    spacing: project.spacing,
    radius: project.radius,
    elevation: project.elevation,
    layout: project.layout,
    previewDevices: project.previewDevices,
    semantics: comparableSemantics(project.semantics),
    removedSeedRoles: project.removedSeedRoles,
    buttonSchemes: project.buttonSchemes,
  };
}
