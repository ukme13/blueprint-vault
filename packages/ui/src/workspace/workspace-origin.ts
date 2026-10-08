import { undoableParts } from "./undoable-parts";
import type { WorkspaceProject } from "./types";

/**
 * Where in the app an edit was made: a studio's path, and the view of it that
 * holds the control when the studio has more than one.
 *
 * What an undo or a redo takes the person back to, so that what is reverted is
 * on screen when it happens, as Figma moves to what an undo changed.
 */
export interface WorkspaceOrigin {
  path: string;
  /** The studio's own view, such as `view=semantics`; absent for its default. */
  query?: string;
}

/**
 * One thing an undo or a redo changed, to be pointed at: a semantic token, and
 * the cell of its row when only one cell moved.
 */
export interface WorkspaceTarget {
  id: string;
  cell?: "name" | "description" | "light" | "dark";
}

/** The most targets one step points at: a bulk edit would flash the table. */
const MAX_TARGETS = 12;

/**
 * The semantic tokens, and cells, that differ between two documents.
 *
 * Read off the document an undo or redo arrives at, so a row that comes back
 * is a target and a row that has gone is not. A token with no counterpart is
 * a target as a whole; otherwise one target per cell that differs, so the
 * flash lands on the reference that was restored and not the whole row.
 */
export function changedSemanticTargets(
  from: WorkspaceProject,
  to: WorkspaceProject,
): WorkspaceTarget[] {
  const was = new Map((from.semantics ?? []).map((token) => [token.id, token]));
  const targets: WorkspaceTarget[] = [];
  for (const token of to.semantics ?? []) {
    const before = was.get(token.id);
    if (!before) {
      targets.push({ id: token.id });
      continue;
    }
    const cells = {
      name: token.name,
      description: token.description,
      light: token.light,
      dark: token.dark,
    } as const;
    for (const cell of Object.keys(cells) as (keyof typeof cells)[]) {
      if (JSON.stringify(cells[cell]) !== JSON.stringify(before[cell])) {
        targets.push({ id: token.id, cell });
      }
    }
  }
  return targets.slice(0, MAX_TARGETS);
}

/**
 * The studio an edit belongs to, read from which undoable part it changed.
 *
 * The first part to differ decides, in the order the studios are listed, so a
 * step that moved a spacing step and the uses pointing at it is a Spacing
 * edit. Layout uses are Spacing's, or Radius's when only radius uses moved.
 * Device ratios are no studio's (the Settings dialog edits them from any), so
 * a step that changed nothing else has no origin and does not move anyone.
 */
export function originOfChange(
  from: WorkspaceProject,
  to: WorkspaceProject,
): WorkspaceOrigin | null {
  const before = undoableParts(from);
  const after = undoableParts(to);
  const differs = (part: keyof typeof before) =>
    JSON.stringify(before[part]) !== JSON.stringify(after[part]);

  if (differs("typographySystem")) return { path: "/typography" };
  if (differs("spacing")) return { path: "/spacing" };
  if (differs("radius")) return { path: "/radius" };
  if (differs("elevation")) return { path: "/elevation" };
  if (differs("layout")) {
    const was = new Map(from.layout.map((token) => [token.id, token]));
    const moved = to.layout.filter(
      (token) => JSON.stringify(token) !== JSON.stringify(was.get(token.id)),
    );
    const onlyRadius =
      moved.length > 0 && moved.every((token) => token.kind === "radius");
    return { path: onlyRadius ? "/radius" : "/spacing" };
  }
  if (
    differs("semantics") ||
    differs("removedSeedRoles") ||
    differs("buttonSchemes")
  ) {
    return { path: "/colour", query: "view=semantics" };
  }
  return null;
}
