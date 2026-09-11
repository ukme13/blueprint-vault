"use client";

import type { MouseEvent } from "react";
import { Lock } from "lucide-react";
import { Tooltip } from "@astryxdesign/core/Tooltip";
import { TableCell, TableRow } from "@astryxdesign/core/Table";
import {
  listConsumers,
  semanticVariableName,
  shortName,
  usedBy,
  type ButtonScheme,
  type ColorTrack,
  type SemanticToken,
} from "@blueprint/ui";
import { ReferenceField } from "./SemanticReferenceField";
import {
  SemanticRowMenuButton,
  type SemanticRowActions,
} from "./SemanticRowMenu";
import { SemanticTextCell } from "./SemanticTextCell";
import { useSemanticRowSort } from "./use-semantic-row-sort";
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
  buttonSchemes: readonly ButtonScheme[];
  onRowClick: (event: MouseEvent<HTMLTableRowElement>) => void;
  onEdit: (cell: SemanticCell) => void;
  onCancel: () => void;
  onReferenceChange: (mode: "light" | "dark", next: SemanticToken[]) => void;
  onAlphaChange: (mode: "light" | "dark", alpha: number) => void;
  onAlphaMove: (
    id: string,
    mode: "light" | "dark",
    move: "down" | "right",
  ) => void;
  onCommitText: (
    cell: "name" | "description",
    value: string,
    move: "down" | "right" | null,
  ) => void;
}

export function SemanticRow(props: SemanticRowProps) {
  const { token } = props;
  const { isDragging, setNodeRef, sortableProps } = useSemanticRowSort({
    id: token.id,
    canReorder: props.canReorder,
    onRowClick: props.onRowClick,
  });
  const consumers = usedBy(token.id, { buttonSchemes: props.buttonSchemes });
  const cell = (key: SemanticColumnKey) => {
    if (key === "name")
      return (
        <TableCell key={key}>
          <div className={styles.nameCell} data-token={token.id}>
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
          onAlphaChange={(alpha) => props.onAlphaChange(key, alpha)}
          onAlphaMove={(move) => props.onAlphaMove(token.id, key, move)}
        />
      </TableCell>
    );
  };
  return (
    <TableRow
      ref={setNodeRef}
      aria-selected={props.selected}
      className={styles.row}
      data-can-reorder={props.canReorder || undefined}
      data-dragging={isDragging || undefined}
      data-selected={props.selected || undefined}
      data-token-row={token.id}
      {...sortableProps}
    >
      {props.columnOrder.map((key) => cell(key))}
    </TableRow>
  );
}
