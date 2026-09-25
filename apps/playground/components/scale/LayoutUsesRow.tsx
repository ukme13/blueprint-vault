"use client";

import type { MouseEvent } from "react";
import { TableCell, TableRow } from "@astryxdesign/core/Table";
import { Lock } from "lucide-react";
import {
  HybridTokenizedInput,
  isSystemLayoutToken,
  MAX_RADIUS_PX,
  MIN_RADIUS_PX,
  hybridValueFromLayoutCell,
  layoutCellFromHybrid,
  layoutVariableName,
  type HybridTokenPreset,
  type LayoutToken,
  type PreviewDevice,
} from "@blueprint/ui";
import { InlineTextCell } from "../InlineTextCell";
import { usePickerSheet } from "../picker-sheet";
import { useSemanticRowSort } from "../palette/use-semantic-row-sort";
import { LayoutUsesRowMenu } from "./LayoutUsesRowMenu";
import styles from "./scale-workspace.module.css";

const SPACING_MAX_PX = 400;

export function LayoutUsesRow({
  autoFocusName,
  canReorder,
  columns,
  presets,
  token,
  onCommitName,
  onDuplicate,
  onReferenceChange,
  onRemove,
  onReset,
  onRowClick,
}: {
  autoFocusName: boolean;
  canReorder: boolean;
  columns: readonly PreviewDevice[];
  presets: readonly HybridTokenPreset[];
  token: LayoutToken;
  onCommitName: (value: string) => void;
  onDuplicate: () => void;
  onReferenceChange: (deviceId: string, cell: string) => void;
  onRemove: () => void;
  onReset: () => void;
  onRowClick?: (event: MouseEvent<HTMLTableRowElement>) => void;
}) {
  const isSystem = isSystemLayoutToken(token.id);
  const { isDragging, setNodeRef, sortableProps } = useSemanticRowSort({
    id: token.id,
    canReorder,
    onRowClick,
  });
  const pickerSheet = usePickerSheet();
  const maxPx = token.kind === "radius" ? MAX_RADIUS_PX : SPACING_MAX_PX;
  const minPx = token.kind === "radius" ? MIN_RADIUS_PX : 0;

  return (
    <TableRow
      ref={setNodeRef}
      className={styles.usesRow}
      data-can-reorder={canReorder || undefined}
      data-dragging={isDragging || undefined}
      data-layout-token={token.id}
      {...sortableProps}
    >
      <TableCell>
        <div className={styles.usesNameCell} data-token={token.id}>
          {isSystem ? (
            /* A label, not a field: the preview and the export rely on this
               name's variable, so it is not the author's to change. */
            <span
              className="flex min-w-0 items-center gap-1.5"
              data-system-use=""
            >
              <span className="truncate">{token.name}</span>
              <span
                aria-label="Built in: its name and variable are fixed"
                className="inline-flex shrink-0 text-fg-muted"
                role="img"
                title="Built in: its name and variable are fixed. Point it anywhere, or reset it."
              >
                <Lock aria-hidden className="size-3" />
              </span>
            </span>
          ) : (
            <InlineTextCell
              autoFocus={autoFocusName}
              label={`${token.id} name`}
              value={token.name}
              onCommit={onCommitName}
            />
          )}
          <code className={styles.usesVar}>{layoutVariableName(token.id)}</code>
        </div>
      </TableCell>
      {columns.map((device) => (
        <TableCell key={device.id}>
          <HybridTokenizedInput
            decimals={0}
            isLabelHidden
            label={`${token.name} on ${device.name}`}
            max={maxPx}
            min={minPx}
            popoverTitle={
              token.kind === "radius" ? "Radius tokens" : "Spacing steps"
            }
            presets={presets}
            sheet={pickerSheet}
            searchPlaceholder={
              token.kind === "radius" ? "Search radius..." : "Search steps..."
            }
            step={1}
            value={hybridValueFromLayoutCell(
              token.kind,
              token.byDevice[device.id],
              presets,
            )}
            valueSuffix="px"
            onChange={(next) =>
              onReferenceChange(device.id, layoutCellFromHybrid(next))
            }
          />
        </TableCell>
      ))}
      <TableCell>
        <LayoutUsesRowMenu
          isSystem={isSystem}
          label={`Actions for ${token.name}`}
          onDuplicate={onDuplicate}
          onRemove={onRemove}
          onReset={onReset}
        />
      </TableCell>
    </TableRow>
  );
}
