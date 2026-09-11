"use client";

import { useCallback, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { ContextMenu } from "@astryxdesign/core/ContextMenu";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import {
  moveToGroup,
  reorderToken,
  renameTokenFromCell,
  type ButtonScheme,
  type ColorTrack,
  type SemanticToken,
} from "@blueprint/ui";
import { SemanticNewGroupDialog } from "./SemanticNewGroupDialog";
import { type SemanticCell } from "./SemanticRow";
import { semanticMenuItems } from "./SemanticRowMenu";
import { SemanticSidebar } from "./SemanticSidebar";
import { SemanticTable } from "./SemanticTable";
import { SemanticToolbar } from "./SemanticToolbar";
import {
  useSemanticActions,
  type SemanticWriteOptions,
} from "./use-semantic-actions";
import { useSemanticKeyboard } from "./use-semantic-keyboard";
import { useSemanticSelection } from "./use-semantic-selection";
import styles from "./semantic-table.module.css";

const RAIL_BELOW = 1024;

interface SemanticEditorProps {
  tokens: SemanticToken[];
  palettes: ColorTrack[];
  buttonSchemes: readonly ButtonScheme[];
  onChange: (next: SemanticToken[], options?: SemanticWriteOptions) => void;
  onUndo?: () => void;
  onRedo?: () => void;
}

export function SemanticEditor({
  tokens,
  palettes,
  buttonSchemes,
  onChange,
  onUndo,
  onRedo,
}: SemanticEditorProps) {
  const [editing, setEditing] = useState<{
    id: string;
    cell: SemanticCell;
  } | null>(null);
  const [grouping, setGrouping] = useState<string[] | null>(null);
  const selection = useSemanticSelection(tokens);
  const isRail = useMediaQuery(`(max-width: ${RAIL_BELOW - 1}px)`);
  const region = useRef<HTMLDivElement>(null);

  const consumers = { buttonSchemes };
  const { apply, dropScheme, actionsFor } = useSemanticActions({
    buttonSchemes,
    isSelected: selection.isSelected,
    onChange,
    onNewGroup: setGrouping,
    onUndo,
    selected: selection.selected,
    tokens,
  });
  const selectRow = useCallback(
    (id: string, event: MouseEvent<HTMLTableRowElement>) => {
      selection.click(id, {
        isRange: event.shiftKey,
        isToggle: event.ctrlKey || event.metaKey,
      });
      region.current?.focus({ preventScroll: true });
    },
    [selection],
  );
  const onKeyDown = useSemanticKeyboard({
    apply,
    clear: selection.clear,
    onEdit: setEditing,
    onRedo,
    onUndo,
    region,
    selectAll: selection.selectAll,
    selected: selection.selected,
    tokens,
    visible: selection.visible,
    buttonSchemes,
  });

  if (palettes.length === 0) {
    return (
      <section aria-label="Semantic tokens" className={styles.empty}>
        <p>
          Semantic tokens point at palette shades, so there is nothing to build
          them from yet. Create a palette first.
        </p>
      </section>
    );
  }

  const commitText = (
    id: string,
    cell: "name" | "description",
    value: string,
    move: "down" | "right" | null,
  ) => {
    const currentIndex = tokens.findIndex((token) => token.id === id);
    const currentToken = tokens[currentIndex];
    const result =
      cell === "name"
        ? renameTokenFromCell(tokens, id, value, consumers)
        : {
            layer: tokens.map((token) =>
              token.id === id ? { ...token, description: value } : token,
            ),
            refusals: [],
            removed: [],
            added: [],
          };
    const nextId =
      cell === "name" ? (result.layer[currentIndex]?.id ?? id) : id;
    const changed =
      cell === "name"
        ? result.layer !== tokens
        : currentToken?.description !== value;
    if (changed) onChange(result.layer, { editKey: `${cell}:${id}` });
    if (!move) return setEditing(null);
    const cells: SemanticCell[] = ["name", "description", "light", "dark"];
    const columnIndex = cells.indexOf(cell);
    if (move === "right" && columnIndex < cells.length - 1)
      return setEditing({ id: nextId, cell: cells[columnIndex + 1]! });
    const row = selection.visible.findIndex((token) => token.id === id);
    const next = selection.visible[row + 1];
    setEditing(next ? { id: next.id, cell } : null);
  };

  return (
    <>
      <section aria-label="Semantic tokens" className={styles.editor}>
        <SemanticSidebar
          buttonSchemes={buttonSchemes}
          group={selection.group}
          isCollapsed={isRail}
          tokens={tokens}
          onGroupChange={selection.setGroup}
          onNewGroup={(name) =>
            apply(moveToGroup(tokens, selection.selected, name, consumers))
          }
          onRemoveScheme={dropScheme}
        />
        <div
          ref={region}
          className={styles.main}
          role="presentation"
          tabIndex={-1}
          onKeyDown={onKeyDown}
        >
          <SemanticToolbar
            group={selection.group}
            onAdd={(next) => {
              const added = next.at(-1);
              onChange(next);
              if (added) setEditing({ id: added.id, cell: "name" });
            }}
            onQueryChange={selection.setQuery}
            palettes={palettes}
            query={selection.query}
            selected={selection.selected.length}
            tokens={tokens}
            total={tokens.length}
            visible={selection.visible.length}
          />
          <ContextMenu
            items={semanticMenuItems(actionsFor())}
            label="Token actions"
            menuWidth={220}
          >
            <div className={styles.tableWrap}>
              <SemanticTable
                actionsFor={actionsFor}
                buttonSchemes={buttonSchemes}
                editing={editing}
                group={selection.group}
                isSelected={selection.isSelected}
                palettes={palettes}
                rows={selection.visible}
                tokens={tokens}
                onCancel={() => setEditing(null)}
                onEdit={(id, cell) => setEditing({ id, cell })}
                onReferenceChange={(id, cell, next) =>
                  onChange(next, { editKey: `${cell}:${id}` })
                }
                onAlphaChange={(id, mode, alpha) =>
                  onChange(
                    tokens.map((token) =>
                      token.id === id
                        ? {
                            ...token,
                            [mode]: { ...token[mode], alpha },
                          }
                        : token,
                    ),
                    { editKey: `alpha:${mode}:${id}` },
                  )
                }
                onAlphaMove={(id, mode, move) => {
                  const row = selection.visible.findIndex(
                    (token) => token.id === id,
                  );
                  const next =
                    move === "down" ? selection.visible[row + 1] : undefined;
                  if (next)
                    region.current
                      ?.querySelector<HTMLElement>(
                        `[data-semantic-token="${next.id}"][data-semantic-cell="${mode}-alpha"] input`,
                      )
                      ?.focus();
                  if (move === "right")
                    region.current
                      ?.querySelector<HTMLElement>(
                        `[data-semantic-token="${id}"][data-semantic-cell="${mode === "light" ? "dark" : "light"}"]`,
                      )
                      ?.focus();
                }}
                onCommitText={commitText}
                onReorder={(activeId, overId) =>
                  onChange(
                    reorderToken(tokens, activeId, overId, selection.selected)
                      .layer,
                  )
                }
                onRowClick={selectRow}
              />
            </div>
          </ContextMenu>
        </div>
      </section>
      <SemanticNewGroupDialog
        count={grouping?.length ?? 0}
        isOpen={grouping !== null}
        onCommit={(name) => {
          if (grouping) apply(moveToGroup(tokens, grouping, name, consumers));
          setGrouping(null);
        }}
        onOpenChange={(isOpen) => {
          if (!isOpen) setGrouping(null);
        }}
      />
    </>
  );
}
