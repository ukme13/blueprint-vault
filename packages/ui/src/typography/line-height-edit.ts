import { parseLineHeightInput, type LineHeightConfig } from "./line-height";

/**
 * A line-height field mid-edit.
 *
 * The field cannot write every number it holds. It holds one whenever it has
 * focus, including the one it was already showing, and writing that back on
 * the way out would pin a value nobody chose — tabbing through the row would
 * turn `auto` into a fixed height. Nothing would look different at the time.
 * It would surface later, when a size change failed to move it.
 *
 * So the number and the fact that somebody typed it travel together, and only
 * a dirty edit is allowed to commit.
 */
export interface LineHeightEdit {
  /** The number in the field, or null while it is empty. */
  draft: number | null;
  /** Whether a person put it there. A blur is not an edit. */
  isDirty: boolean;
}

/** The field following the model — on first render, and when it moves underneath. */
export function resetLineHeightEdit(committed: number | null): LineHeightEdit {
  return { draft: committed, isDirty: false };
}

/** A number typed into the field. */
export function typeLineHeight(value: number): LineHeightEdit {
  return { draft: value, isDirty: true };
}

/**
 * The field emptied.
 *
 * Clean rather than dirty, because emptying is an answer and commits on the
 * spot rather than waiting for a blur — leaving it dirty would commit `auto`
 * a second time when focus left.
 */
export function clearLineHeightEdit(): LineHeightEdit {
  return { draft: null, isDirty: false };
}

/** The field left alone — focus moved on, or the value went back to auto. */
export function settleLineHeightEdit(edit: LineHeightEdit): LineHeightEdit {
  return edit.isDirty ? { ...edit, isDirty: false } : edit;
}

/**
 * What a blur or an Enter should write, and the edit that follows it.
 *
 * `config` is null when there is nothing to write: the field was not edited,
 * or what it holds does not parse. Either way the edit settles, so a second
 * blur does not try again.
 */
export function commitLineHeightEdit(edit: LineHeightEdit): {
  edit: LineHeightEdit;
  config: LineHeightConfig | null;
} {
  if (!edit.isDirty) return { edit, config: null };

  const settled = settleLineHeightEdit(edit);
  if (edit.draft === null) return { edit: settled, config: { mode: "auto" } };

  return { edit: settled, config: parseLineHeightInput(String(edit.draft)) };
}
