"use client";

import { useCallback, useRef, useState } from "react";

export const SEMANTIC_COLUMNS = [
  ["name", 180],
  ["variable", 250],
  ["description", 220],
  ["light", 160],
  ["dark", 160],
  ["actions", 52],
] as const;

type ColumnKey = (typeof SEMANTIC_COLUMNS)[number][0];
export type SemanticColumnKey = ColumnKey;

/** Local layout state: resize never changes the saved colour system. */
export function useSemanticColumnWidths() {
  const [widths, setWidths] = useState<Record<ColumnKey, number>>(
    () => Object.fromEntries(SEMANTIC_COLUMNS) as Record<ColumnKey, number>,
  );
  const drag = useRef<{ key: ColumnKey; start: number; width: number } | null>(
    null,
  );
  const [order, setOrder] = useState<ColumnKey[]>(() =>
    SEMANTIC_COLUMNS.map(([key]) => key),
  );

  const resize = useCallback((key: ColumnKey, width: number) => {
    setWidths((current) => ({ ...current, [key]: Math.max(96, width) }));
  }, []);

  const onPointerDown = useCallback(
    (key: ColumnKey, event: React.PointerEvent<HTMLButtonElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = { key, start: event.clientX, width: widths[key] };
    },
    [widths],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      const active = drag.current;
      if (active)
        resize(active.key, active.width + event.clientX - active.start);
    },
    [resize],
  );

  const onPointerUp = useCallback(() => {
    drag.current = null;
  }, []);

  const reorder = useCallback((from: ColumnKey, to: ColumnKey) => {
    if (from === to) return;
    setOrder((current) => {
      const next = current.filter((key) => key !== from);
      next.splice(next.indexOf(to), 0, from);
      return next;
    });
  }, []);

  return {
    order,
    widths,
    resize,
    separatorProps: (key: ColumnKey) => ({
      "aria-label": `Resize ${key} column`,
      "aria-orientation": "vertical" as const,
      "aria-valuemin": 96,
      "aria-valuenow": widths[key],
      "aria-valuetext": `${widths[key]} pixels`,
      onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (event.key === "ArrowLeft") resize(key, widths[key] - 16);
        if (event.key === "ArrowRight") resize(key, widths[key] + 16);
      },
      onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) =>
        onPointerDown(key, event),
      onPointerMove,
      onPointerUp,
      role: "separator" as const,
      tabIndex: 0,
    }),
    headerProps: (key: ColumnKey) => ({
      draggable: key !== "actions",
      onDragStart: (event: React.DragEvent<HTMLElement>) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", key);
      },
      onDragOver: (event: React.DragEvent<HTMLElement>) =>
        event.preventDefault(),
      onDrop: (event: React.DragEvent<HTMLElement>) => {
        event.preventDefault();
        const from = event.dataTransfer.getData("text/plain") as ColumnKey;
        if (SEMANTIC_COLUMNS.some(([candidate]) => candidate === from))
          reorder(from, key);
      },
    }),
  };
}
