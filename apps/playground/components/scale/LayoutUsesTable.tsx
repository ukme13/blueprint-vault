"use client";

import { useState, type ReactNode } from "react";
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
  addLayoutToken,
  Button,
  duplicateLayoutToken,
  layoutVariableName,
  removeLayoutToken,
  renameLayoutToken,
  reorderLayoutTokens,
  resolveRadius,
  resolveSpacing,
  setLayoutReference,
  sortPreviewDevicesLargestFirst,
  type LayoutToken,
  type LayoutTokenKind,
  type PreviewDevice,
  type RadiusScale,
  type SpacingScale,
} from "@blueprint/ui";
import { useSemanticTableSort } from "../palette/use-semantic-row-sort";
import { LayoutUsesRow } from "./LayoutUsesRow";
import { RadiusUseSamples } from "./RadiusUseSamples";
import styles from "./scale-workspace.module.css";

function DropGap({ colSpan }: { colSpan: number }) {
  return (
    <TableRow aria-hidden="true" className={styles.usesDropGap} data-drop-gap>
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

export function LayoutUsesTable({
  devices,
  kind,
  radius,
  spacing,
  tokens,
  onChange,
}: {
  devices: readonly PreviewDevice[];
  kind: LayoutTokenKind;
  radius: RadiusScale;
  spacing: SpacingScale;
  tokens: readonly LayoutToken[];
  onChange: (next: LayoutToken[]) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const columns = sortPreviewDevicesLargestFirst(devices);
  const rows = tokens.filter((token) => token.kind === kind);
  const ids = rows.map((token) => token.id);
  const colSpan = columns.length + 2;
  const presets =
    kind === "radius"
      ? resolveRadius(radius).map((token) => ({
          id: token.id,
          name: token.name,
          value: token.px,
        }))
      : resolveSpacing(spacing).map((token) => ({
          id: token.name,
          name: token.name,
          value: token.px,
        }));
  const label = kind === "radius" ? "Radius uses" : "Spacing uses";
  const hint =
    kind === "radius"
      ? "Each use remaps a radius name per preview frame, or a typed px. Surface is for cards; Button, Input and Chip are for those controls, so a pill button can sit beside a square input."
      : "Each use points at a spacing step per preview frame, or a typed px. Columns come from Settings.";
  const sort = useSemanticTableSort(
    ids,
    (activeId, overId) =>
      onChange(reorderLayoutTokens(tokens, activeId, overId)),
    () => true,
  );
  const activeToken = sort.activeId
    ? tokens.find((token) => token.id === sort.activeId)
    : undefined;

  const addUse = () => {
    const next = addLayoutToken(tokens, kind, devices);
    const added = next.at(-1);
    onChange(next);
    if (added) setEditingId(added.id);
  };

  return (
    <section className={styles.uses} aria-label={label}>
      <header className={styles.usesToolbar}>
        <div>
          <h2>Uses</h2>
          <p className={styles.usesHint}>{hint}</p>
        </div>
        <Button
          scheme="neutral"
          size="small"
          variant="outlined"
          onClick={addUse}
        >
          Add use
        </Button>
      </header>
      <DndContext
        measuring={sort.measuring}
        sensors={sort.sensors}
        onDragStart={sort.onDragStart}
        onDragOver={sort.onDragOver}
        onDragCancel={sort.onDragCancel}
        onDragEnd={sort.onDragEnd}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {/* A width per column and a sideways scroll, as on Semantics. Shared
              out by the screen, three device columns left a step like "40"
              breaking over two lines on a phone. */}
          <div className="min-w-0 overflow-x-auto">
            <Table
              aria-label={label}
              className="table-fixed"
              density="compact"
              dividers="grid"
              hasHover
              verticalAlign="middle"
            >
              <colgroup>
                <col className="w-48" />
                {columns.map((device) => (
                  <col key={device.id} className="w-44" />
                ))}
                <col className="w-14" />
              </colgroup>
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>Use</TableHeaderCell>
                  {columns.map((device) => (
                    <TableHeaderCell key={device.id}>
                      {device.name}
                      <span className={styles.usesWidth}>
                        {device.widthPx}px
                      </span>
                    </TableHeaderCell>
                  ))}
                  <TableHeaderCell>
                    <span className={styles.srOnly}>Actions</span>
                  </TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.flatMap((token) =>
                  withDropGap(
                    <LayoutUsesRow
                      key={token.id}
                      autoFocusName={editingId === token.id}
                      canReorder={rows.length > 1}
                      columns={columns}
                      presets={presets}
                      token={token}
                      onCommitName={(value) => {
                        onChange(renameLayoutToken(tokens, token.id, value));
                        setEditingId(null);
                      }}
                      onDuplicate={() =>
                        onChange(duplicateLayoutToken(tokens, token.id))
                      }
                      onReferenceChange={(deviceId, cell) =>
                        onChange(
                          setLayoutReference(tokens, token.id, deviceId, cell),
                        )
                      }
                      onRemove={() => {
                        onChange(removeLayoutToken(tokens, token.id));
                        if (editingId === token.id) setEditingId(null);
                      }}
                    />,
                    token.id,
                    colSpan,
                    sort.gap,
                  ),
                )}
              </TableBody>
            </Table>
          </div>
        </SortableContext>
        <DragOverlay dropAnimation={null}>
          {activeToken ? (
            <div className={styles.usesDragOverlay}>
              <span>{activeToken.name}</span>
              <code className={styles.usesVar}>
                {layoutVariableName(activeToken.id)}
              </code>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      {kind === "radius" && (
        <RadiusUseSamples columns={columns} radius={radius} tokens={rows} />
      )}
    </section>
  );
}
