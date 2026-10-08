import { createHistory, type History } from "../history";
import type { WorkspaceProject } from "./types";

/**
 * Undo for the workspace: one history for every studio.
 *
 * The studios used to keep one each, in a ref that went when the studio did,
 * so an edit made in Typography could not be undone from Spacing. This one
 * lives in the workspace store, above every studio, and outlasts navigation.
 *
 * It holds whole documents, by reference (a document is never written into,
 * only replaced), but a step is only taken when the parts an undo owns
 * changed, and an undo puts back only those parts. What is left alone is
 * everything an undo should not reach: the name, the colours, the text typed
 * into a preview, a view setting. Without that a step would be taken for a
 * rename and an undo would quietly revert somebody's colours.
 *
 * See docs/roadmap/scale-studio.md.
 */

/** How many undo steps the workspace keeps. */
export const WORKSPACE_HISTORY_LIMIT = 50;

export type WorkspaceEditKey = string | undefined;

/**
 * The parts of a document an undo owns.
 *
 * The type system (not its name, which is the workspace's, nor the preview
 * text and settings beside it in the same slice), the scales and the layout uses that point at them, the device
 * ratios the system's own mirrors, and the semantic layer with what goes
 * with it. The palette, the name and the view settings are not here.
 */
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

function undoableParts(project: WorkspaceProject) {
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

/**
 * A comparable form of the undoable parts.
 *
 * By value, not by reference: a document read back from storage is a fresh
 * object every time, so every write would otherwise look like an edit, and
 * saving what was already there would take a step.
 */
export function undoableKey(project: WorkspaceProject): string {
  return JSON.stringify(undoableParts(project));
}

/**
 * The current document with an earlier one's undoable parts put back.
 *
 * Patched onto `current`, not swapped for `target`: the name, the palette and
 * the rest have moved on since, and an undo takes back what was edited, not
 * what happened to sit beside it.
 */
export function restoreUndoable(
  current: WorkspaceProject,
  target: WorkspaceProject,
): WorkspaceProject {
  return {
    ...current,
    typography: target.typography
      ? current.typography
        ? {
            ...current.typography,
            /* The name it has now: it follows the workspace's, not a step. */
            system: {
              ...target.typography.system,
              name: current.typography.system.name,
            },
          }
        : target.typography
      : current.typography,
    spacing: target.spacing,
    radius: target.radius,
    elevation: target.elevation,
    layout: target.layout,
    previewDevices: target.previewDevices,
    semantics: target.semantics,
    removedSeedRoles: target.removedSeedRoles,
    buttonSchemes: target.buttonSchemes,
  };
}

export interface WorkspaceHistory {
  /**
   * Record the document after an edit this session made.
   *
   * A step is taken only if the undoable parts changed; `key` coalesces
   * consecutive writes of the same control, as a slider that commits on every
   * tick would otherwise put each tick in the stack. A write with no key never
   * coalesces, and neither does the first after an undo, a redo or a sync.
   * Returns whether it was recorded.
   *
   * `origin` is where the edit was made, for a place that is not a studio the
   * change would name (the Preview's tags set layout uses). Without it the
   * origin is read from what changed.
   */
  commit(
    project: WorkspaceProject,
    options?: { key?: WorkspaceEditKey; origin?: WorkspaceOrigin },
  ): boolean;
  /**
   * Adopt a document this session did not produce, as no step.
   *
   * The first read on load, or another tab's write. Undo means "take back what
   * I did".
   */
  sync(project: WorkspaceProject): void;
  /** The document to put back one step, or null. */
  undo(): WorkspaceProject | null;
  /** The document to put forward one step, or null. */
  redo(): WorkspaceProject | null;
  /**
   * Where the edit the last undo or redo moved over was made, or null.
   *
   * Undoing takes back the edit that was made last, so it is that edit's
   * place; redoing puts one back, and it is that one's. Read straight after
   * the call. Null after a commit or a sync.
   */
  readonly lastOrigin: WorkspaceOrigin | null;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly size: number;
}

interface Entry {
  project: WorkspaceProject;
  key: string;
  /** Where the edit that made this version was made. */
  origin: WorkspaceOrigin | null;
}

const entryOf = (
  project: WorkspaceProject,
  origin: WorkspaceOrigin | null = null,
): Entry => ({
  project,
  key: undoableKey(project),
  origin,
});

export function createWorkspaceHistory(
  initial: WorkspaceProject,
  limit = WORKSPACE_HISTORY_LIMIT,
): WorkspaceHistory {
  const history: History<Entry> = createHistory({
    limit,
    initial: entryOf(initial),
  });

  let openEdit: WorkspaceEditKey;
  let lastOrigin: WorkspaceOrigin | null = null;

  return {
    commit(project, options) {
      const previous = history.present;
      const entry = entryOf(project);
      if (entry.key === previous?.key) return false;
      lastOrigin = null;
      entry.origin =
        options?.origin ??
        (previous ? originOfChange(previous.project, project) : null);
      const key = options?.key;
      const coalesces = key !== undefined && key === openEdit;
      openEdit = key;
      if (coalesces) history.replaceTop(entry);
      else history.push(entry);
      return true;
    },

    sync(project) {
      openEdit = undefined;
      lastOrigin = null;
      history.sync(entryOf(project));
    },

    undo() {
      openEdit = undefined;
      /* The version being left is the edit being taken back. */
      const leaving = history.present?.origin ?? null;
      const target = history.undo();
      lastOrigin = target ? leaving : null;
      return target?.project ?? null;
    },

    redo() {
      openEdit = undefined;
      const target = history.redo();
      lastOrigin = target?.origin ?? null;
      return target?.project ?? null;
    },

    get lastOrigin() {
      return lastOrigin;
    },

    get canUndo() {
      return history.canUndo;
    },
    get canRedo() {
      return history.canRedo;
    },
    get size() {
      return history.size;
    },
  };
}
