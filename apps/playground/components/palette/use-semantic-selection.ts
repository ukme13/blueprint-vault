"use client";

import { useCallback, useMemo, useState } from "react";
import {
  EMPTY_SELECTION,
  filterSemanticTokens,
  selectAllVisible,
  selectionAfterClick,
  selectionWithin,
  type SemanticToken,
  type Selection,
} from "@blueprint/ui";

/**
 * What the table is showing and what is selected in it.
 *
 * Both are the editor's, not the store's: a filter and a selection are how
 * somebody is looking at a layer right now, and neither belongs in a design
 * system, a file or another tab. Every rule is a pure function in
 * `@blueprint/ui`; this is the state they are applied to.
 *
 * See docs/roadmap/semantic-table-editor.md, stage 4.
 */

export interface SemanticSelection {
  /** The group prefix being shown, or null for all of them. */
  group: string | null;
  setGroup: (group: string | null) => void;
  query: string;
  setQuery: (query: string) => void;
  /** The rows the filter leaves, in the layer's order. */
  visible: SemanticToken[];
  /** The ids of those rows, which is what a range is read along. */
  visibleIds: string[];
  selected: string[];
  isSelected: (id: string) => boolean;
  /** A click on a row, with whichever modifiers were held. */
  click: (
    id: string,
    modifiers?: { isRange?: boolean; isToggle?: boolean },
  ) => void;
  selectAll: () => void;
  clear: () => void;
}

export function useSemanticSelection(
  tokens: SemanticToken[],
): SemanticSelection {
  const [group, setGroupState] = useState<string | null>(null);
  const [query, setQueryState] = useState("");
  const [selection, setSelection] = useState<Selection>(EMPTY_SELECTION);

  const visible = useMemo(
    () => filterSemanticTokens(tokens, { group, query }),
    [tokens, group, query],
  );
  const visibleIds = useMemo(() => visible.map((token) => token.id), [visible]);

  /* Narrowed to what is on screen at render rather than in an effect. A
     selection that survived a filter for one paint is a selection an operation
     could reach through, and the whole rule is that it cannot touch a row
     somebody cannot see. `selectionWithin` returns the same object when the
     filter hid none of them, so this does not re-render on every keystroke. */
  const onScreen = selectionWithin(selection, visibleIds);

  const setGroup = useCallback((next: string | null) => {
    setGroupState(next);
    /* Cleared outright rather than narrowed: changing the group is somebody
       looking somewhere else, and carrying three invisible rows into the next
       operation is the surprise this rule exists to prevent. */
    setSelection(EMPTY_SELECTION);
  }, []);

  const setQuery = useCallback((next: string) => {
    setQueryState(next);
    setSelection(EMPTY_SELECTION);
  }, []);

  const click = useCallback(
    (id: string, modifiers?: { isRange?: boolean; isToggle?: boolean }) => {
      setSelection((current) =>
        selectionAfterClick(current, {
          id,
          visible: visibleIds,
          ...modifiers,
        }),
      );
    },
    [visibleIds],
  );

  const selectAll = useCallback(() => {
    setSelection(selectAllVisible(visibleIds));
  }, [visibleIds]);

  const clear = useCallback(() => setSelection(EMPTY_SELECTION), []);

  const chosen = useMemo(() => new Set(onScreen.ids), [onScreen.ids]);

  return {
    group,
    setGroup,
    query,
    setQuery,
    visible,
    visibleIds,
    selected: onScreen.ids,
    isSelected: (id) => chosen.has(id),
    click,
    selectAll,
    clear,
  };
}
