import { semanticGroupLabel, semanticGroupOf } from "./token-rows";
import type { SemanticToken } from "./semantic";
import type { SemanticRefusal } from "./selection-ops";

/**
 * What the table shows, and what is selected in it.
 *
 * Filtering and selection are not stored anywhere — they are how somebody is
 * looking at a layer right now, not part of the design system — but the rules
 * are still rules, and a shift-click that picks the wrong range is a bulk
 * delete of the wrong rows. So they live here as pure functions and the editor
 * holds the two pieces of state.
 *
 * See docs/roadmap/semantic-table-editor.md, stage 4.
 */

export interface SemanticGroupCount {
  group: string;
  label: string;
  count: number;
}

/**
 * The sidebar's entries: every group in the layer, with how many are in it.
 *
 * Built on `groupSemanticTokens`' rules rather than a second pass over the
 * ids, so the sidebar, the export and the documentation page cannot disagree
 * about which group a token is in. Order follows the layer, which is the order
 * somebody arranged.
 */
export function semanticGroupCounts(
  tokens: SemanticToken[],
): SemanticGroupCount[] {
  const counts = new Map<string, number>();
  for (const token of tokens) {
    const group = semanticGroupOf(token.id);
    counts.set(group, (counts.get(group) ?? 0) + 1);
  }
  return [...counts].map(([group, count]) => ({
    group,
    label: semanticGroupLabel(group),
    count,
  }));
}

export interface SemanticFilter {
  /** A group prefix, or null for all of them. */
  group?: string | null;
  /** Free text, matched against the id and the name. */
  query?: string;
}

/**
 * The rows a filter leaves visible, in the layer's own order.
 *
 * Id **and** name, because the two are different search terms for the same
 * row: somebody looking for `--color-fg-muted` types "fg", and somebody
 * looking at their own vocabulary types "muted text". Case-insensitive, and
 * the query is trimmed, so a trailing space from a paste does not empty the
 * table.
 */
export function filterSemanticTokens(
  tokens: SemanticToken[],
  filter: SemanticFilter = {},
): SemanticToken[] {
  const query = (filter.query ?? "").trim().toLowerCase();
  const group = filter.group ?? null;

  return tokens.filter((token) => {
    if (group !== null && semanticGroupOf(token.id) !== group) return false;
    if (!query) return true;
    return (
      token.id.toLowerCase().includes(query) ||
      token.name.toLowerCase().includes(query)
    );
  });
}

export interface Selection {
  /** The selected ids, in the visible order rather than the click order. */
  ids: string[];
  /**
   * The row a range extends from.
   *
   * Kept separate from the selection because shift-clicking twice has to grow
   * and shrink one range from where it started, not chain from wherever the
   * last click landed. Without it, shift-click behaves like "add another row"
   * and there is no way to make a range smaller.
   */
  anchor: string | null;
}

export const EMPTY_SELECTION: Selection = { ids: [], anchor: null };

export interface SelectionClick {
  /** The row that was clicked. */
  id: string;
  /** The ids currently on screen, in the order they are drawn. */
  visible: readonly string[];
  /** Shift: take everything between the anchor and this row. */
  isRange?: boolean;
  /** Ctrl or Cmd: add this row, or take it out again. */
  isToggle?: boolean;
}

/** Keep `ids` in the order the rows are drawn, so a range reads as one block. */
function inVisibleOrder(
  ids: Iterable<string>,
  visible: readonly string[],
): string[] {
  const wanted = new Set(ids);
  return visible.filter((id) => wanted.has(id));
}

/**
 * The selection after a click, by the rules every table has.
 *
 * A plain click replaces the selection; Ctrl or Cmd adds and removes one row;
 * Shift takes the block between the anchor and the row clicked. Shift with no
 * anchor is a plain click, which is what happens on the first click into a
 * table and is the case a range implementation usually forgets.
 *
 * A row that is not visible cannot be clicked, so `visible` is both the order
 * a range is read in and the guarantee that a range never reaches a row
 * somebody has filtered away.
 */
export function selectionAfterClick(
  selection: Selection,
  click: SelectionClick,
): Selection {
  const { id, visible } = click;

  if (click.isRange && selection.anchor !== null) {
    const from = visible.indexOf(selection.anchor);
    const to = visible.indexOf(id);
    /* An anchor that has been filtered away is no anchor at all. Falling back
       to a plain click beats extending a range from a row nobody can see. */
    if (from !== -1 && to !== -1) {
      const range = visible.slice(Math.min(from, to), Math.max(from, to) + 1);
      /* The anchor stays where it was, so shift-clicking again grows and
         shrinks one range rather than chaining from the last click. */
      return { ids: [...range], anchor: selection.anchor };
    }
  }

  if (click.isToggle) {
    const next = new Set(selection.ids);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return { ids: inVisibleOrder(next, visible), anchor: id };
  }

  return { ids: [id], anchor: id };
}

/** Everything on screen. What Ctrl/Cmd-A takes. */
export function selectAllVisible(visible: readonly string[]): Selection {
  return {
    ids: [...visible],
    /* The first row, so a shift-click after select-all shrinks the block from
       the top rather than from wherever the pointer last was. */
    anchor: visible[0] ?? null,
  };
}

/**
 * Drop anything that is no longer on screen.
 *
 * Called when the group or the search changes, so an operation can never touch
 * a row somebody cannot see. Clearing outright would be simpler and worse for
 * one case that matters: nothing changes for a filter that did not actually
 * hide any of the selected rows.
 */
export function selectionWithin(
  selection: Selection,
  visible: readonly string[],
): Selection {
  const onScreen = new Set(visible);
  const ids = selection.ids.filter((id) => onScreen.has(id));
  if (ids.length === selection.ids.length) return selection;
  return {
    ids,
    anchor:
      selection.anchor !== null && onScreen.has(selection.anchor)
        ? selection.anchor
        : null,
  };
}

/**
 * What to tell somebody when an operation would not do part of what they asked.
 *
 * One sentence, naming the rows and the first thing that reads each — the
 * whole list per row would be four lines of toast for one refusal, and the
 * first consumer is enough to make the reason concrete. The `usedBy` badge on
 * the row itself carries the rest.
 *
 * Empty string for no refusals, so a caller can write
 * `if (message) toast(message)`.
 */
export function describeRefusals(refusals: readonly SemanticRefusal[]): string {
  if (refusals.length === 0) return "";

  const named = refusals.map((refusal) => {
    const first = refusal.usedBy[0];
    return first ? `${refusal.id} (${first})` : refusal.id;
  });

  const rows = refusals.length === 1 ? "1 row was" : `${refusals.length} were`;
  return `${rows} kept: ${named.join(", ")}.`;
}
