"use client";

import type { MouseEvent } from "react";
import { GripVertical, Lock } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Tooltip } from "@astryxdesign/core/Tooltip";
import { TableCell, TableRow } from "@astryxdesign/core/Table";
import {
  listConsumers,
  semanticVariableName,
  shortName,
  usedBy,
  type ColorTrack,
  type SemanticToken,
} from "@blueprint/ui";
import { ReferenceField } from "./SemanticReferenceField";
import {
  SemanticRowMenuButton,
  type SemanticRowActions,
} from "./SemanticRowMenu";
import { SemanticTextCell } from "./SemanticTextCell";
import type { SemanticColumnKey } from "./use-semantic-column-widths";
import styles from "./semantic-table.module.css";

export type SemanticCell = "name" | "description" | "light" | "dark";

interface SemanticRowProps {
  token: SemanticToken;
  tokens: SemanticToken[];
  palettes: ColorTrack[];
  selected: boolean;
  columnOrder: SemanticColumnKey[];
  editing: SemanticCell | null;
  actions: SemanticRowActions;
  canReorder: boolean;
  onRowClick: (event: MouseEvent<HTMLTableRowElement>) => void;
  onEdit: (cell: SemanticCell) => void;
  onCancel: () => void;
  onReferenceChange: (mode: "light" | "dark", next: SemanticToken[]) => void;
  onCommitText: (
    cell: "name" | "description",
    value: string,
    move: "down" | "right" | null,
  ) => void;
}

export function SemanticRow(props: SemanticRowProps) {
  const { token } = props;
  const {
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: token.id, disabled: !props.canReorder });
  const consumers = usedBy(token.id);
  const cell = (key: SemanticColumnKey) => {
    if (key === "name")
      return (
        <TableCell key={key}>
          <div className={styles.nameCell} data-token={token.id}>
            <button
              ref={setActivatorNodeRef}
              aria-label={`Reorder ${token.name}`}
              className={styles.rowDragHandle}
              data-row-drag-handle
              type="button"
              {...attributes}
              {...listeners}
            >
              <GripVertical aria-hidden="true" size={14} />
            </button>
            {consumers.length > 0 && (
              <Tooltip
                content={`Read by ${listConsumers(consumers)}. It cannot be renamed.`}
              >
                <span
                  aria-label={`${token.id} is read by ${listConsumers(consumers)}`}
                  className={styles.lock}
                  data-locked={token.id}
                  role="img"
                >
                  <Lock aria-hidden="true" size={12} />
                </span>
              </Tooltip>
            )}
            <SemanticTextCell
              key={`${token.id}-name-${props.editing === "name" ? "edit" : "read"}`}
              cell="name"
              isEditing={props.editing === "name"}
              label={`${token.id} name`}
              tokenId={token.id}
              value={shortName(token.id)}
              onBeginEdit={() => props.onEdit("name")}
              onCancel={props.onCancel}
              onCommit={(value, move) =>
                props.onCommitText("name", value, move)
              }
            />
          </div>
        </TableCell>
      );
    if (key === "variable")
      return (
        <TableCell key={key}>
          <code className={styles.variable}>
            {semanticVariableName(token.id)}
          </code>
        </TableCell>
      );
    if (key === "description")
      return (
        <TableCell key={key}>
          <SemanticTextCell
            key={`${token.id}-description-${props.editing === "description" ? "edit" : "read"}`}
            cell="description"
            isEditing={props.editing === "description"}
            label={`${token.id} description`}
            tokenId={token.id}
            value={token.description}
            onBeginEdit={() => props.onEdit("description")}
            onCancel={props.onCancel}
            onCommit={(value, move) =>
              props.onCommitText("description", value, move)
            }
          />
        </TableCell>
      );
    if (key === "actions")
      return (
        <TableCell key={key}>
          <SemanticRowMenuButton
            actions={props.actions}
            label={`Actions for ${token.name}`}
          />
        </TableCell>
      );
    return (
      <TableCell key={key}>
        <ReferenceField
          mode={key}
          palettes={props.palettes}
          token={token}
          tokens={props.tokens}
          onChange={(next) => props.onReferenceChange(key, next)}
        />
      </TableCell>
    );
  };
  return (
    <TableRow
      ref={setNodeRef}
      aria-selected={props.selected}
      className={styles.row}
      data-selected={props.selected || undefined}
      data-token-row={token.id}
      onClick={(event) => {
        if (
          !(event.target as HTMLElement).closest(
            "input, button, select, textarea, [role='combobox'], [role='listbox'], [data-row-drag-handle]",
          )
        )
          props.onRowClick(event);
      }}
      style={{
        opacity: isDragging ? 0.45 : undefined,
        transform: CSS.Translate.toString(transform),
        transition,
      }}
    >
      {props.columnOrder.map((key) => cell(key))}
    </TableRow>
  );
}
