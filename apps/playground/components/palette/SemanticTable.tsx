"use client";

import type { MouseEvent } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
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
  type ColorTrack,
  type SemanticToken,
} from "@blueprint/ui";
import { type SemanticRowActions } from "./SemanticRowMenu";
import { SemanticRow, type SemanticCell } from "./SemanticRow";
import { useSemanticColumnWidths } from "./use-semantic-column-widths";
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
  onCommitText: (
    id: string,
    cell: "name" | "description",
    value: string,
    move: "down" | "right" | null,
  ) => void;
  onReorder: (activeId: string, overId: string) => void;
}

export function SemanticTable(props: SemanticTableProps) {
  const columns = useSemanticColumnWidths();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const groups =
    props.group === null
      ? groupSemanticTokens(props.rows)
      : [{ group: props.group, label: "", tokens: props.rows }];
  const ids = groups.flatMap((group) => group.tokens.map((token) => token.id));
  const onDragEnd = (event: DragEndEvent) => {
    if (event.over)
      props.onReorder(String(event.active.id), String(event.over.id));
  };
  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
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
              {columns.order.map((key) => (
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
                      <TableCell colSpan={6}>{group.label}</TableCell>
                    </TableRow>,
                  ]
                : []),
              ...group.tokens.map((token) => (
                <SemanticRow
                  key={token.id}
                  token={token}
                  tokens={props.tokens}
                  palettes={props.palettes}
                  columnOrder={columns.order}
                  selected={props.isSelected(token.id)}
                  editing={
                    props.editing?.id === token.id ? props.editing.cell : null
                  }
                  actions={props.actionsFor(token.id)}
                  canReorder={group.tokens.length > 1}
                  onRowClick={(event) => props.onRowClick(token.id, event)}
                  onEdit={(cell) => props.onEdit(token.id, cell)}
                  onCancel={props.onCancel}
                  onReferenceChange={(mode, next) =>
                    props.onReferenceChange(token.id, mode, next)
                  }
                  onCommitText={(cell, value, move) =>
                    props.onCommitText(token.id, cell, value, move)
                  }
                />
              )),
            ])}
          </TableBody>
        </Table>
      </SortableContext>
    </DndContext>
  );
}
