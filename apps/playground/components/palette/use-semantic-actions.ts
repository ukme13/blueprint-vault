"use client";

import { useCallback, useState } from "react";
import { useToast } from "@astryxdesign/core/Toast";
import {
  deleteTokens,
  describeRefusals,
  duplicateTokens,
  formatSemanticClipboard,
  groupSemanticTokens,
  moveToGroup,
  parseSemanticClipboard,
  pasteTokens,
  type SemanticEdit,
  type SemanticToken,
} from "@blueprint/ui";
import type { SemanticRowActions } from "./SemanticRowMenu";

/**
 * The five operations, bound to a layer and a selection.
 *
 * Every one of them is a stage 2 function; this decides which rows they apply
 * to, hands the result to the store, and turns the refusals into a sentence.
 * No rule lives here, which is the plan's first safety rule read from the
 * other end: stage 4 wires stage 2 and contains no logic of its own.
 *
 * See docs/roadmap/semantic-table-editor.md, stage 4.
 */

export interface SemanticWriteOptions {
  editKey?: string;
  justRemoved?: readonly string[];
}

interface UseSemanticActions {
  tokens: SemanticToken[];
  selected: string[];
  isSelected: (id: string) => boolean;
  onChange: (next: SemanticToken[], options?: SemanticWriteOptions) => void;
  /** Ask for a group name, then move these rows into it. */
  onNewGroup: (ids: string[]) => void;
}

export interface SemanticActions {
  /** Apply an edit: store the layer, and say what it would not do. */
  apply: (result: SemanticEdit) => void;
  /** The menu for a row, or for the selection when no row is named. */
  actionsFor: (id?: string) => SemanticRowActions;
  /** The rows an action applies to, given the row it was opened on. */
  target: (id?: string) => string[];
}

export function useSemanticActions({
  tokens,
  selected,
  isSelected,
  onChange,
  onNewGroup,
}: UseSemanticActions): SemanticActions {
  const toast = useToast();
  /* The clipboard as this page last saw it. The system clipboard is written
     too, so a copy travels between tabs and into an editor — but reading it
     back needs a permission a paste cannot wait on, and a Paste that opened a
     browser prompt would be worse than one that works. */
  const [clipboard, setClipboard] = useState<SemanticToken[]>([]);

  const apply = useCallback(
    (result: SemanticEdit) => {
      if (result.layer !== tokens) {
        onChange(result.layer, { justRemoved: result.removed });
      }
      const message = describeRefusals(result.refusals);
      if (message) toast({ body: message, type: "info" });
    },
    [onChange, toast, tokens],
  );

  const target = useCallback(
    (id?: string) => (id && !isSelected(id) ? [id] : selected),
    [isSelected, selected],
  );

  const actionsFor = useCallback(
    (id?: string): SemanticRowActions => {
      const ids = target(id);
      return {
        canPaste: clipboard.length > 0,
        count: ids.length,
        copy: () => {
          const text = formatSemanticClipboard(tokens, ids);
          setClipboard(parseSemanticClipboard(text));
          void navigator.clipboard?.writeText(text).catch(() => {
            /* A browser that refuses the system clipboard still has the
               in-page one above, which is what Paste reads. */
          });
        },
        paste: () => apply(pasteTokens(tokens, clipboard, ids.at(-1) ?? null)),
        newGroup: () => onNewGroup(ids),
        moveToGroup: (group) => apply(moveToGroup(tokens, ids, group)),
        groups: groupSemanticTokens(tokens).map(({ group, label }) => ({
          id: group,
          label,
        })),
        duplicate: () => apply(duplicateTokens(tokens, ids)),
        remove: () => apply(deleteTokens(tokens, ids)),
      };
    },
    [apply, clipboard, onNewGroup, target, tokens],
  );

  return { apply, actionsFor, target };
}
