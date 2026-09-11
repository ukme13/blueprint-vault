"use client";

import { useCallback, useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { useToast, type ShowToastFn } from "@astryxdesign/core/Toast";
import {
  BUTTON_SCHEME_LABELS,
  deleteTokens,
  describeRefusals,
  describeSemanticEdit,
  dropButtonScheme,
  duplicateTokens,
  formatSemanticClipboard,
  groupSemanticTokens,
  moveToGroup,
  parseSemanticClipboard,
  pasteTokens,
  type ButtonScheme,
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
  buttonSchemes?: readonly ButtonScheme[];
}

interface UseSemanticActions {
  tokens: SemanticToken[];
  selected: string[];
  isSelected: (id: string) => boolean;
  onChange: (next: SemanticToken[], options?: SemanticWriteOptions) => void;
  /** Ask for a group name, then move these rows into it. */
  onNewGroup: (ids: string[]) => void;
  /** Reverse the last recorded semantic write. */
  onUndo?: () => void;
  /** Which button tones this workspace still has. */
  buttonSchemes: readonly ButtonScheme[];
}

export interface SemanticActions {
  /** Apply an edit: store the layer, and say what it would not do. */
  apply: (result: SemanticEdit) => void;
  /** Drop a button tone and the eight roles that only existed to feed it. */
  dropScheme: (scheme: ButtonScheme) => void;
  /** The menu for a row, or for the selection when no row is named. */
  actionsFor: (id?: string) => SemanticRowActions;
  /** The rows an action applies to, given the row it was opened on. */
  target: (id?: string) => string[];
}

/**
 * One toast for the latest edit.
 *
 * Overwrite so a second delete does not stack, and the Undo on it is always
 * the last step. Stay until dismissed when the step can be taken back — five
 * seconds is not long enough to notice a row has gone and reach for Undo.
 */
function announceEdit(toast: ShowToastFn, body: string, onUndo?: () => void) {
  let dismiss = () => {};
  dismiss = toast({
    body,
    type: "info",
    uniqueID: "semantic-edit",
    isAutoHide: !onUndo,
    endContent: onUndo ? (
      <Button
        label="Undo"
        size="sm"
        variant="secondary"
        onClick={() => {
          dismiss();
          onUndo();
        }}
      />
    ) : undefined,
  });
}

export function useSemanticActions({
  tokens,
  selected,
  isSelected,
  onChange,
  onNewGroup,
  onUndo,
  buttonSchemes,
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
      const success = describeSemanticEdit(tokens, result);
      const refusal = describeRefusals(result.refusals);
      const body = [success, refusal].filter(Boolean).join(" ");
      if (body) announceEdit(toast, body, success ? onUndo : undefined);
    },
    [onChange, onUndo, toast, tokens],
  );

  const dropScheme = useCallback(
    (scheme: ButtonScheme) => {
      /* Schemes first, then the roles: deleteTokens still sees the Button as
         a consumer if the tone is on the list, and would refuse every row. */
      const dropped = dropButtonScheme(tokens, buttonSchemes, scheme);
      const schemesChanged =
        dropped.buttonSchemes.join(",") !== buttonSchemes.join(",");
      if (dropped.edit.layer !== tokens || schemesChanged) {
        onChange(dropped.edit.layer, {
          justRemoved: dropped.edit.removed,
          buttonSchemes: dropped.buttonSchemes,
        });
      }
      const success = schemesChanged
        ? `Removed the ${BUTTON_SCHEME_LABELS[scheme]} tone.`
        : describeSemanticEdit(tokens, dropped.edit);
      const refusal = describeRefusals(dropped.edit.refusals);
      const body = [success, refusal].filter(Boolean).join(" ");
      if (body) announceEdit(toast, body, success ? onUndo : undefined);
    },
    [buttonSchemes, onChange, onUndo, toast, tokens],
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
        moveToGroup: (group) =>
          apply(moveToGroup(tokens, ids, group, { buttonSchemes })),
        groups: groupSemanticTokens(tokens).map(({ group, label }) => ({
          id: group,
          label,
        })),
        duplicate: () => apply(duplicateTokens(tokens, ids)),
        remove: () => apply(deleteTokens(tokens, ids, { buttonSchemes })),
      };
    },
    [apply, buttonSchemes, clipboard, onNewGroup, target, tokens],
  );

  return { apply, dropScheme, actionsFor, target };
}
