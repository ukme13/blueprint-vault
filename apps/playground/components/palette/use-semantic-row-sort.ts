"use client";

import {
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";
import {
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type PointerSensorOptions,
} from "@dnd-kit/core";
import { useSortable, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { semanticGroupOf } from "@blueprint/ui";

/**
 * How far a pointer must travel before a row click becomes a drag.
 *
 * Shared by the PointerSensor and the click handler so a select cannot start
 * a sortable pass, and a real drag cannot also fire as a click.
 */
export const ROW_DRAG_DISTANCE = 16;

const INTERACTIVE =
  "a, input, button, select, textarea, [role='combobox'], [role='listbox'], [role='menu'], [role='dialog'], [contenteditable='true']";

export function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest(INTERACTIVE));
}

/**
 * PointerSensor that ignores controls inside the row.
 *
 * Listeners live on the `<tr>`, so a pointerdown on a chip or input bubbles
 * here. The default sensor would treat that as a drag; this one does not.
 */
export class SemanticRowPointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: "onPointerDown" as const,
      handler: (
        { nativeEvent: event }: PointerEvent,
        { onActivation }: PointerSensorOptions,
      ) => {
        if (!event.isPrimary || event.button !== 0) return false;
        if (isInteractiveTarget(event.target)) return false;
        onActivation?.({ event });
        return true;
      },
    },
  ];
}

interface SemanticRowSort {
  id: string;
  canReorder: boolean;
  onRowClick: (event: MouseEvent<HTMLTableRowElement>) => void;
}

/** Sortable binding for one semantic row: no transforms, click stays a click. */
export function useSemanticRowSort({
  id,
  canReorder,
  onRowClick,
}: SemanticRowSort) {
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const { isDragging, listeners, setNodeRef } = useSortable({
    id,
    disabled: !canReorder,
    animateLayoutChanges: () => false,
    transition: null,
  });
  return {
    isDragging,
    setNodeRef,
    sortableProps: {
      onPointerDown: (event: PointerEvent<HTMLTableRowElement>) => {
        if (isInteractiveTarget(event.target)) return;
        pointerStart.current = { x: event.clientX, y: event.clientY };
        listeners?.onPointerDown?.(event);
      },
      onKeyDown: (event: KeyboardEvent<HTMLTableRowElement>) => {
        if (isInteractiveTarget(event.target)) return;
        listeners?.onKeyDown?.(event);
      },
      onClick: (event: MouseEvent<HTMLTableRowElement>) => {
        const start = pointerStart.current;
        pointerStart.current = null;
        if (
          start &&
          Math.hypot(event.clientX - start.x, event.clientY - start.y) >=
            ROW_DRAG_DISTANCE
        )
          return;
        if (!isInteractiveTarget(event.target)) onRowClick(event);
      },
    },
  };
}

/**
 * Where the drop slot sits, matching `reorderToken`'s insert side.
 *
 * No slot on the dragged row itself, and none across a folder boundary —
 * those drags are a no-op, so a gap there would be a lie.
 */
export function dropGapPlacement(
  ids: readonly string[],
  activeId: string | null,
  overId: string | null,
): { id: string; side: "before" | "after" } | null {
  if (!activeId || !overId || activeId === overId) return null;
  const from = ids.indexOf(activeId);
  const to = ids.indexOf(overId);
  if (from === -1 || to === -1) return null;
  if (semanticGroupOf(activeId) !== semanticGroupOf(overId)) return null;
  return { id: overId, side: from < to ? "after" : "before" };
}

const DROPPABLE_MEASURING = {
  droppable: { strategy: MeasuringStrategy.WhileDragging },
};

/** Drag sensors, overlay id, and the drop slot for the semantic table. */
export function useSemanticTableSort(
  ids: readonly string[],
  onReorder: (activeId: string, overId: string) => void,
) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(SemanticRowPointerSensor, {
      activationConstraint: { distance: ROW_DRAG_DISTANCE },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const clearDrag = () => {
    setActiveId(null);
    setOverId(null);
  };
  return {
    activeId,
    gap: dropGapPlacement(ids, activeId, overId),
    sensors,
    measuring: DROPPABLE_MEASURING,
    onDragStart: (event: DragStartEvent) => {
      const id = String(event.active.id);
      setActiveId(id);
      setOverId(id);
    },
    onDragOver: (event: DragOverEvent) => {
      setOverId(event.over ? String(event.over.id) : null);
    },
    onDragCancel: clearDrag,
    onDragEnd: (event: DragEndEvent) => {
      clearDrag();
      if (event.over) onReorder(String(event.active.id), String(event.over.id));
    },
  };
}
