"use client";

import type { MouseEvent } from "react";
import { TableCell, TableRow } from "@astryxdesign/core/Table";
import { Link, Lock } from "lucide-react";
import {
  HybridTokenizedInput,
  isSquishFollowing,
  isSquishRatio,
  isSystemLayoutToken,
  SQUISH_RATIOS,
  MAX_RADIUS_PX,
  MIN_RADIUS_PX,
  hybridValueFromLayoutCell,
  layoutCellFromHybrid,
  layoutVariableName,
  type HybridTokenPreset,
  type LayoutToken,
  type PreviewDevice,
  type SquishRatio,
} from "@blueprint/ui";
import { InlineTextCell } from "../InlineTextCell";
import { usePickerSheet } from "../picker-sheet";
import { useSemanticRowSort } from "../palette/use-semantic-row-sort";
import { LayoutUsesRowMenu } from "./LayoutUsesRowMenu";
import { SheetSelector } from "../SheetSelector";
import styles from "./scale-workspace.module.css";

const SPACING_MAX_PX = 400;

const SQUISH_CUSTOM = "custom";

/* "Squish 50%" … "Symmetric", then Custom: each frame set by hand. */
const SQUISH_OPTIONS = [
  ...SQUISH_RATIOS.map((ratio) => ({
    value: String(ratio),
    label: ratio === 1 ? "Symmetric" : `Squish ${Math.round(ratio * 100)}%`,
  })),
  { value: SQUISH_CUSTOM, label: "Custom" },
];

export function LayoutUsesRow({
  autoFocusName,
  canReorder,
  columns,
  hint,
  presets,
  token,
  onCommitName,
  onDuplicate,
  onReferenceChange,
  onRemove,
  onReset,
  onRowClick,
  onSquishChange,
  onClearSquishOverride,
}: {
  autoFocusName: boolean;
  canReorder: boolean;
  columns: readonly PreviewDevice[];
  /** A line under the variable, such as what the value makes of a button. */
  hint?: string | null;
  presets: readonly HybridTokenPreset[];
  token: LayoutToken;
  onCommitName: (value: string) => void;
  onDuplicate: () => void;
  onReferenceChange: (deviceId: string, cell: string) => void;
  onRemove: () => void;
  onReset: () => void;
  onRowClick?: (event: MouseEvent<HTMLTableRowElement>) => void;
  /** A squished use only: pick its ratio, or Custom. */
  onSquishChange?: (squish: SquishRatio | null) => void;
  /** A squished use only: put a typed frame back on the squish. */
  onClearSquishOverride?: (deviceId: string) => void;
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
          {hint && (
            <span className={styles.usesRowHint} data-row-hint={token.id}>
              {hint}
            </span>
          )}
          {onSquishChange && token.squish !== undefined && (
            /* How the block inset follows the inline one, as a badge under
               the name rather than a column only this row would use. */
            <span className="w-fit" data-squish={token.squish ?? "custom"}>
              <SheetSelector
                isLabelHidden
                label={`${token.name} squish`}
                options={SQUISH_OPTIONS}
                size="sm"
                startIcon={<Link aria-hidden className="size-3.5" />}
                value={
                  token.squish === null ? SQUISH_CUSTOM : String(token.squish)
                }
                onChange={(value) => {
                  const ratio = Number(value);
                  onSquishChange(isSquishRatio(ratio) ? ratio : null);
                }}
              />
            </span>
          )}
        </div>
      </TableCell>
      {columns.map((device) => {
        /* Squished, a frame either follows (default look, nothing to clear)
           or was typed by hand (accent, with a ✕ back to following), as a
           type role's size is on a frame of its own. */
        const isTyped =
          typeof token.squish === "number" &&
          !isSquishFollowing(token, device.id);
        return (
          <TableCell key={device.id}>
            <HybridTokenizedInput
              isOverride={isTyped}
              onRelink={
                isTyped && onClearSquishOverride
                  ? () => onClearSquishOverride(device.id)
                  : undefined
              }
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
        );
      })}
      <TableCell>
        <LayoutUsesRowMenu
          isSystem={isSystem}
          label={`Actions for ${token.name}`}
          tokenName={token.name}
          variableName={layoutVariableName(token.id)}
          onDuplicate={onDuplicate}
          onRemove={onRemove}
          onReset={onReset}
        />
      </TableCell>
    </TableRow>
  );
}
