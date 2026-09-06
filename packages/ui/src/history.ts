/**
 * Undo and redo, for anything.
 *
 * A stack of past values and a stack of future ones, with the current value
 * between them. Whole values rather than reversed actions: every edit in this
 * studio is already a pure `T -> T`, so keeping the value before it is both
 * cheaper to write and impossible to get wrong. An inverse-action history has
 * to derive an undo for every operation, and a single missing inverse is a
 * corruption nobody notices until it is saved.
 *
 * Generic and free of React on purpose. What is being undone here is a slice
 * of a workspace; the same mechanism should serve a palette or a type scale
 * without either learning about the other, which is the reuse the plan's undo
 * decision asks for.
 *
 * See docs/roadmap/semantic-table-editor.md.
 */

export interface HistoryOptions<T> {
  /**
   * How many undo steps to keep.
   *
   * Bounded rather than unlimited because each step is a whole slice, and a
   * session that edits for an hour would otherwise hold every version of it
   * for as long as the tab is open. The oldest goes when the limit is reached:
   * an editor that refused to record a change once its history was full would
   * silently stop being undoable at the worst moment.
   */
  limit: number;
  /** Where the history starts. Absent means it starts at the first push. */
  initial?: T;
}

export interface History<T> {
  /** The value now. Undefined only before anything has been pushed. */
  readonly present: T | undefined;
  /** Whether there is a previous value to go back to. */
  readonly canUndo: boolean;
  /** Whether an undone value is waiting to be redone. */
  readonly canRedo: boolean;
  /** How many undo steps are held. Bounded by `limit`; a guard reads this. */
  readonly size: number;
  /** How many redo steps are held. */
  readonly redoSize: number;

  /**
   * Record a new value as its own step.
   *
   * Discards the redo branch, the way every editor does: once somebody has
   * undone three steps and then typed, the three they undid are a path they
   * chose not to take. Keeping them would mean a redo that jumps sideways into
   * a version of the document that never existed.
   */
  push(next: T): T;

  /**
   * Replace the current value without adding a step.
   *
   * What coalescing is made of. An in-place edit that commits on every
   * keystroke would otherwise put "s", "su", "sur", "surf" into the history
   * and make one undo take back one letter.
   *
   * Falls back to `push` when there is nothing to replace, so a caller does
   * not have to know whether this is the first write of the edit.
   */
  replaceTop(next: T): T;

  /**
   * Adopt a value from outside without recording it.
   *
   * For a change this session did not make — another tab writing the same
   * workspace, an import replacing it. Undo means "take back what I did", and
   * a step somebody else's tab put there is not something this one can take
   * back: undoing it would write their work away with no way to tell that from
   * an ordinary undo.
   *
   * The past and the future are left exactly as they are, so the steps this
   * session took are still its own to undo.
   */
  sync(value: T): T;

  /** Go back one step, or null when there is nowhere to go. */
  undo(): T | null;

  /** Go forward one step, or null when there is nothing to redo. */
  redo(): T | null;

  /** Forget everything, keeping the present. For a document being replaced. */
  clear(): void;

  /** The past, oldest first. A snapshot, for tests and for a debug view. */
  entries(): T[];
}

export function createHistory<T>(options: HistoryOptions<T>): History<T> {
  /* At least one, so a caller that passes 0 or a negative gets a history that
     records one step rather than one that silently records none and reports
     itself as working. */
  const limit = Math.max(1, Math.floor(options.limit));

  let past: T[] = [];
  let future: T[] = [];
  let present: T | undefined = options.initial;

  return {
    get present() {
      return present;
    },
    get canUndo() {
      return past.length > 0;
    },
    get canRedo() {
      return future.length > 0;
    },
    get size() {
      return past.length;
    },
    get redoSize() {
      return future.length;
    },

    push(next) {
      if (present !== undefined) {
        past.push(present);
        /* Trimmed on every push rather than checked on read, so the array
           itself never grows past the limit. A history that held everything
           and only *reported* the last N would be a memory leak with a
           reassuring number on it. */
        if (past.length > limit) past = past.slice(past.length - limit);
      }
      future = [];
      present = next;
      return next;
    },

    replaceTop(next) {
      if (present === undefined) return this.push(next);
      present = next;
      /* The redo branch goes here too. Typing into a cell after undoing is
         still a new edit; that it coalesces with the keystroke before it does
         not make it part of the path that was undone. */
      future = [];
      return next;
    },

    sync(value) {
      present = value;
      return value;
    },

    undo() {
      const previous = past.pop();
      if (previous === undefined) return null;
      if (present !== undefined) future.unshift(present);
      present = previous;
      return previous;
    },

    redo() {
      const next = future.shift();
      if (next === undefined) return null;
      if (present !== undefined) past.push(present);
      present = next;
      return next;
    },

    clear() {
      past = [];
      future = [];
    },

    entries() {
      return [...past];
    },
  };
}
