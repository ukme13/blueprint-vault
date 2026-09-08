"use client";

import type { MouseEvent, ReactNode } from "react";
import { DndContext, DragOverlay } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@astryxdesign/core/Table";
import {
  groupSemanticTokens,
  semanticVariableName,
  shortName,
  type ColorTrack,
  type SemanticToken,
} from "@blueprint/ui";
import { type SemanticRowActions } from "./SemanticRowMenu";
import { SemanticRow, type SemanticCell } from "./SemanticRow";
import { useSemanticTableSort } from "./use-semantic-row-sort";
import {
  useSemanticColumnWidths,
  type SemanticColumnKey,
} from "./use-semantic-column-widths";
import styles from "./semantic-table.module.css";

interface SemanticTableProps {
  rows: SemanticToken[];
  tokens: SemanticToken[];
  palettes: ColorTrack[];
  group: string | null;
  isSelected: (id: string) => boolean;
  editing: { id: string; cell: SemanticCell } | null;
  actionsFor: (id: string) => SemanticRowActions;
  onRowClick: (id: string, event: MouseEvent<HTMLTableRowElement>) => void;
  onEdit: (id: string, cell: SemanticCell) => void;
  onCancel: () => void;
  onReferenceChange: (
    id: string,
    cell: "light" | "dark",
    next: SemanticToken[],
  ) => void;
  onAlphaChange: (id: string, mode: "light" | "dark", alpha: number) => void;
  onAlphaMove: (
    id: string,
    mode: "light" | "dark",
    move: "down" | "right",
  ) => void;
  onCommitText: (
    id: string,
    cell: "name" | "description",
    value: string,
    move: "down" | "right" | null,
  ) => void;
  onReorder: (activeId: string, overId: string) => void;
}

function DropGap({ colSpan }: { colSpan: number }) {
  return (
    <TableRow aria-hidden="true" className={styles.dropGap} data-drop-gap>
      <TableCell colSpan={colSpan} />
    </TableRow>
  );
}

function withDropGap(
  row: ReactNode,
  tokenId: string,
  colSpan: number,
  gap: { id: string; side: "before" | "after" } | null,
): ReactNode[] {
  if (gap?.id !== tokenId) return [row];
  const slot = <DropGap key={`drop-gap-${tokenId}`} colSpan={colSpan} />;
  return gap.side === "before" ? [slot, row] : [row, slot];
}

export function SemanticTable(props: SemanticTableProps) {
  const columns = useSemanticColumnWidths();
  const groups =
    props.group === null
      ? groupSemanticTokens(props.rows)
      : [{ group: props.group, label: "", tokens: props.rows }];
  const ids = groups.flatMap((group) => group.tokens.map((token) => token.id));
  const sort = useSemanticTableSort(ids, props.onReorder);
  const activeToken = sort.activeId
    ? props.tokens.find((token) => token.id === sort.activeId)
    : undefined;
  const tokenRow = (token: SemanticToken, canReorder: boolean) => (
    <SemanticRow
      key={token.id}
      token={token}
      tokens={props.tokens}
      palettes={props.palettes}
      columnOrder={columns.order}
      selected={props.isSelected(token.id)}
      editing={props.editing?.id === token.id ? props.editing.cell : null}
      actions={props.actionsFor(token.id)}
      canReorder={canReorder}
      onRowClick={(event) => props.onRowClick(token.id, event)}
      onEdit={(cell) => props.onEdit(token.id, cell)}
      onCancel={props.onCancel}
      onReferenceChange={(mode, next) =>
        props.onReferenceChange(token.id, mode, next)
      }
      onAlphaChange={(mode, alpha) =>
        props.onAlphaChange(token.id, mode, alpha)
      }
      onAlphaMove={props.onAlphaMove}
      onCommitText={(cell, value, move) =>
        props.onCommitText(token.id, cell, value, move)
      }
    />
  );
  return (
    <DndContext
      measuring={sort.measuring}
      sensors={sort.sensors}
      onDragStart={sort.onDragStart}
      onDragOver={sort.onDragOver}
      onDragCancel={sort.onDragCancel}
      onDragEnd={sort.onDragEnd}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <Table
          density="compact"
          dividers="grid"
          hasHover
          verticalAlign="middle"
        >
          <colgroup>
            {columns.order.map((key) => (
              <col key={key} style={{ width: columns.widths[key] }} />
            ))}
          </colgroup>
          <TableHeader>
            <TableRow isHeaderRow>
              {columns.order.map((key: SemanticColumnKey) => (
                <TableHeaderCell key={key} className={styles.resizeHeader}>
                  {key === "actions" ? (
                    <span className={styles.srOnly}>Actions</span>
                  ) : (
                    <span {...columns.headerProps(key)}>
                      {key[0]!.toUpperCase() + key.slice(1)}
                    </span>
                  )}
                  {key !== "actions" && (
                    <button
                      className={styles.resizeHandle}
                      type="button"
                      {...columns.separatorProps(key)}
                    />
                  )}
                </TableHeaderCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.flatMap((group) => [
              ...(props.group === null
                ? [
                    <TableRow
                      className={styles.groupHeading}
                      data-group-heading={group.group}
                      key={`heading-${group.group}`}
                    >
                      <TableCell colSpan={columns.order.length}>
                        {group.label}
                      </TableCell>
                    </TableRow>,
                  ]
                : []),
              ...group.tokens.flatMap((token) =>
                withDropGap(
                  tokenRow(token, group.tokens.length > 1),
                  token.id,
                  columns.order.length,
                  sort.gap,
                ),
              ),
            ])}
          </TableBody>
        </Table>
      </SortableContext>
      <DragOverlay dropAnimation={null}>
        {activeToken ? (
          <div className={styles.dragOverlay}>
            <span>{shortName(activeToken.id)}</span>
            <code className={styles.variable}>
              {semanticVariableName(activeToken.id)}
            </code>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
