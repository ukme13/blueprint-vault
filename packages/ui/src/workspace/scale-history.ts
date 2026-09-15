import { createHistory, type History } from "../history";
import { defaultElevationScale, type ElevationScale } from "../scale/elevation";
import { defaultRadiusScale, type RadiusScale } from "../scale/radius";
import { defaultSpacingScale, type SpacingScale } from "../scale/spacing";
import type { WorkspaceProject } from "./types";
import { emptyWorkspace } from "./workspace";

/**
 * Undo for the three scale slices.
 *
 * Spacing, radius and elevation are one history because they are one studio:
 * an undo means the last thing I did on this page, not "the last spacing
 * edit, ignoring the roundness I just dragged". The generic stack holds the
 * values; this file only decides when a write is a new step.
 *
 * See docs/roadmap/scale-studio.md.
 */

export interface ScaleSnapshot {
  spacing: SpacingScale;
  radius: RadiusScale;
  elevation: ElevationScale;
}

/** How many undo steps the scale studio keeps. */
export const SCALE_HISTORY_LIMIT = 50;

export type ScaleEditKey = string | undefined;

function cloneSpacing(scale: SpacingScale): SpacingScale {
  return {
    baseUnitPx: scale.baseUnitPx,
    density: Number.isFinite(scale.density) ? scale.density : 1,
    steps: [...scale.steps],
  };
}

function cloneRadius(scale: RadiusScale): RadiusScale {
  return {
    multiplier: scale.multiplier,
    tokens: scale.tokens.map((token) => ({ ...token })),
  };
}

function cloneElevation(scale: ElevationScale): ElevationScale {
  return {
    colour: { ...scale.colour },
    levels: scale.levels.map((level) => ({
      ...level,
      layers: level.layers.map((layer) => ({
        ...layer,
        opacity: { ...layer.opacity },
      })),
    })),
  };
}

export function cloneScaleSnapshot(snapshot: ScaleSnapshot): ScaleSnapshot {
  return {
    spacing: cloneSpacing(snapshot.spacing),
    radius: cloneRadius(snapshot.radius),
    elevation: cloneElevation(snapshot.elevation),
  };
}

/** The three slices as they stand in a workspace. */
export function scaleSnapshotOf(
  project: WorkspaceProject | null,
): ScaleSnapshot {
  return cloneScaleSnapshot({
    spacing: project?.spacing ?? defaultSpacingScale(),
    radius: project?.radius ?? defaultRadiusScale(),
    elevation: project?.elevation ?? defaultElevationScale(),
  });
}

/** A workspace with this snapshot in it. Name and other slices stay. */
export function workspaceWithScaleSnapshot(
  current: WorkspaceProject | null,
  snapshot: ScaleSnapshot,
): WorkspaceProject {
  const cloned = cloneScaleSnapshot(snapshot);
  return {
    ...(current ?? emptyWorkspace()),
    spacing: cloned.spacing,
    radius: cloned.radius,
    elevation: cloned.elevation,
  };
}

export interface ScaleHistory {
  /**
   * Record an edit this session made.
   *
   * A patch rather than a whole snapshot so a spacing write does not have to
   * re-state radius and elevation. Missing fields stay as they are.
   *
   * `key` coalesces consecutive writes of the same control: a slider that
   * commits on every tick would otherwise put each 0.05 into the stack.
   */
  commit(
    patch: Partial<ScaleSnapshot>,
    options?: { key?: ScaleEditKey },
  ): ScaleSnapshot;
  readonly present: ScaleSnapshot;
  /**
   * Adopt a slice this session did not produce.
   *
   * Another tab writing the same workspace, or the first read on load. Not a
   * step: undo means "take back what I did".
   */
  sync(snapshot: ScaleSnapshot): ScaleSnapshot;
  undo(): ScaleSnapshot | null;
  redo(): ScaleSnapshot | null;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly size: number;
}

export function createScaleHistory(
  initial: ScaleSnapshot,
  limit = SCALE_HISTORY_LIMIT,
): ScaleHistory {
  const start = cloneScaleSnapshot(initial);
  const history: History<ScaleSnapshot> = createHistory({
    limit,
    initial: start,
  });

  let openEdit: ScaleEditKey;

  return {
    get present() {
      return history.present ?? start;
    },

    commit(patch, options) {
      const key = options?.key;
      const present = history.present ?? start;
      const next = cloneScaleSnapshot({
        spacing: patch.spacing ?? present.spacing,
        radius: patch.radius ?? present.radius,
        elevation: patch.elevation ?? present.elevation,
      });
      const coalesces = key !== undefined && key === openEdit;
      openEdit = key;
      return coalesces ? history.replaceTop(next) : history.push(next);
    },

    sync(snapshot) {
      openEdit = undefined;
      return history.sync(cloneScaleSnapshot(snapshot));
    },

    undo() {
      openEdit = undefined;
      return history.undo();
    },

    redo() {
      openEdit = undefined;
      return history.redo();
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
