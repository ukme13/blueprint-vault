"use client";

import { useCallback } from "react";
import { deleteTokens, type SemanticToken } from "@blueprint/ui";
import type { SemanticCell } from "./SemanticRow";

interface SemanticKeyboardOptions {
  tokens: SemanticToken[];
  visible: SemanticToken[];
  selectAll: () => void;
  clear: () => void;
  selected: string[];
  apply: (result: ReturnType<typeof deleteTokens>) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onEdit: (next: { id: string; cell: SemanticCell } | null) => void;
  region: React.RefObject<HTMLDivElement | null>;
}

/** Spreadsheet movement is UI state, separate from the semantic model. */
export function useSemanticKeyboard({
  tokens,
  visible,
  selectAll,
  clear,
  selected,
  apply,
  onUndo,
  onRedo,
  onEdit,
  region,
}: SemanticKeyboardOptions) {
  return useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement;
      const typing = !!target.closest("input, textarea, [role='combobox']");
      const meta = event.ctrlKey || event.metaKey;
      if (meta && event.key.toLowerCase() === "z") {
        event.preventDefault();
        (event.shiftKey ? onRedo : onUndo)?.();
        return;
      }
      if (typing) return;
      const cell = target.closest<HTMLElement>("[data-semantic-cell]");
      const cellName = cell?.dataset.semanticCell as SemanticCell | undefined;
      const tokenId = cell?.dataset.semanticToken;
      if (cellName && tokenId) {
        if (event.key === "Enter") {
          event.preventDefault();
          if (cellName === "name" || cellName === "description")
            onEdit({ id: tokenId, cell: cellName });
          else (cell as HTMLButtonElement).click();
          return;
        }
        const cells: SemanticCell[] = ["name", "description", "light", "dark"];
        const column = cells.indexOf(cellName);
        const row = visible.findIndex((token) => token.id === tokenId);
        let nextToken = tokenId;
        let nextCell = cellName;
        if (event.key === "ArrowLeft" && column > 0)
          nextCell = cells[column - 1]!;
        if (event.key === "ArrowRight" && column < cells.length - 1)
          nextCell = cells[column + 1]!;
        if (event.key === "ArrowUp" && row > 0)
          nextToken = visible[row - 1]!.id;
        if (event.key === "ArrowDown" && row < visible.length - 1)
          nextToken = visible[row + 1]!.id;
        if (nextToken !== tokenId || nextCell !== cellName) {
          event.preventDefault();
          region.current
            ?.querySelector<HTMLElement>(
              `[data-semantic-token="${nextToken}"][data-semantic-cell="${nextCell}"]`,
            )
            ?.focus();
          return;
        }
      }
      if (meta && event.key.toLowerCase() === "a") {
        event.preventDefault();
        selectAll();
        return;
      }
      if (event.key === "Escape") clear();
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        apply(deleteTokens(tokens, selected));
      }
    },
    [
      apply,
      clear,
      onEdit,
      onRedo,
      onUndo,
      region,
      selectAll,
      selected,
      tokens,
      visible,
    ],
  );
}
