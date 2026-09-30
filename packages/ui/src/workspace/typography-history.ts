import { createHistory, type History } from "../history";
import type { TypeSystem } from "../typography/system";

/**
 * Undo for the type system: its fonts, groups, roles and scale.
 *
 * Whole systems rather than reversed actions, as the scale and semantics
 * histories keep them: every edit is a `TypeSystem -> TypeSystem` function,
 * so the value before it is the undo. A system is treated as immutable, as
 * those functions return a new one and never write into the old, so a step is
 * held by reference and not copied; a history of fifty steps costs fifty
 * pointers and the parts each edit changed.
 *
 * Only the system. The unit, the specimen text, the preview document and the
 * device ratios sit beside it in the project and are not part of a step.
 *
 * See docs/roadmap/scale-studio.md.
 */

/** How many undo steps the typography studio keeps. */
export const TYPOGRAPHY_HISTORY_LIMIT = 50;

export type TypographyEditKey = string | undefined;

export interface TypographyHistory {
  /**
   * Record the system after an edit this session made.
   *
   * `key` coalesces consecutive writes of the same control: a line height
   * stepped with the arrow keys, or a name typed a letter at a time, is one
   * undo and not one per tick. A write with no key never coalesces, and
   * neither does the first after an undo, a redo or a sync.
   *
   * The same system as is already present is not a step: an edit that changed
   * nothing must not leave an undo that does nothing.
   */
  commit(system: TypeSystem, options?: { key?: TypographyEditKey }): TypeSystem;
  readonly present: TypeSystem;
  /**
   * Adopt a system this session did not produce, as a step nobody can undo.
   *
   * The first read on load, or a project replaced from outside. Undo means
   * "take back what I did".
   */
  sync(system: TypeSystem): TypeSystem;
  undo(): TypeSystem | null;
  redo(): TypeSystem | null;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly size: number;
}

export function createTypographyHistory(
  initial: TypeSystem,
  limit = TYPOGRAPHY_HISTORY_LIMIT,
): TypographyHistory {
  const history: History<TypeSystem> = createHistory({ limit, initial });

  let openEdit: TypographyEditKey;

  return {
    get present() {
      return history.present ?? initial;
    },

    commit(system, options) {
      const key = options?.key;
      if (system === history.present) return system;
      const coalesces = key !== undefined && key === openEdit;
      openEdit = key;
      return coalesces ? history.replaceTop(system) : history.push(system);
    },

    sync(system) {
      openEdit = undefined;
      return history.sync(system);
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
