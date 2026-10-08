"use client";

import {
  useCallback,
  useRef,
  useState,
  type PointerEvent,
  type RefObject,
} from "react";

interface Drag {
  startX: number;
  startY: number;
  fromX: number;
  fromY: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * A panel the person can pick up by a handle and put somewhere else.
 *
 * The popover a panel sits in is placed by the browser against its trigger,
 * so it is that surface that moves, by the `translate` property, which is
 * separate from the `transform` its own placement may use. It is held within
 * the window on every side, so it cannot be dropped where it cannot be
 * reached, and put back where it started by `reset`.
 *
 * The handle is whatever gets `handleProps`, and only its own empty space picks
 * the panel up. A press on anything inside it, a control or the list a control
 * opens, is that thing's: starting a drag there would take the pointer from
 * it, and its click would never come.
 */
export function useDraggablePanel(
  panelRef: RefObject<HTMLElement | null>,
  isEnabled: boolean,
) {
  const [isDragging, setIsDragging] = useState(false);
  const drag = useRef<Drag | null>(null);
  const offset = useRef({ x: 0, y: 0 });

  const surface = useCallback(
    () => panelRef.current?.closest<HTMLElement>("[popover]") ?? null,
    [panelRef],
  );

  const place = useCallback(
    (x: number, y: number) => {
      offset.current = { x, y };
      const element = surface();
      if (element) element.style.translate = x || y ? `${x}px ${y}px` : "";
    },
    [surface],
  );

  const reset = useCallback(() => place(0, 0), [place]);

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (!isEnabled || event.button !== 0) return;
    if (event.target !== event.currentTarget) return;
    const element = surface();
    if (!element) return;
    const box = element.getBoundingClientRect();
    /* Where it would sit unmoved, so the limits are the window's edges less
       the place it started from. */
    const left = box.left - offset.current.x;
    const top = box.top - offset.current.y;
    drag.current = {
      startX: event.clientX,
      startY: event.clientY,
      fromX: offset.current.x,
      fromY: offset.current.y,
      minX: -left,
      maxX: window.innerWidth - (left + box.width),
      minY: -top,
      maxY: window.innerHeight - (top + box.height),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const current = drag.current;
    if (!current) return;
    const clamp = (value: number, low: number, high: number) =>
      Math.min(Math.max(value, low), Math.max(low, high));
    place(
      clamp(
        current.fromX + event.clientX - current.startX,
        current.minX,
        current.maxX,
      ),
      clamp(
        current.fromY + event.clientY - current.startY,
        current.minY,
        current.maxY,
      ),
    );
  };

  const end = () => {
    drag.current = null;
    setIsDragging(false);
  };

  return {
    isDragging,
    reset,
    handleProps: {
      "data-draggable": isEnabled ? "" : undefined,
      "data-dragging": isDragging ? "" : undefined,
      onPointerDown,
      onPointerMove,
      onPointerUp: end,
      onPointerCancel: end,
    },
  };
}
