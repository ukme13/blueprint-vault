"use client";

import type { FormEventHandler, KeyboardEvent, ReactNode } from "react";
import { usePreviewSlotStyle } from "./preview-styles-context";

/**
 * A card on the page: the surface that holds some copy, and can be picked.
 * A field and a divider are surfaces of the same kind.
 *
 * Every card of a group takes the group's style, so the three feature cards
 * or the three plans change together, and every one is marked with the
 * group's id for the selection to outline. A press on the surface itself
 * picks the group; the slots and buttons inside pick their own and stop the
 * press before it gets here.
 */
export function CardSurface({
  as: Tag,
  cardId,
  className,
  children,
  onInspect,
  ...rest
}: {
  as: "article" | "div" | "form";
  cardId: string;
  className?: string;
  children: ReactNode;
  onInspect: (id: string) => void;
  "data-plan"?: number;
  "aria-label"?: string;
  onSubmit?: FormEventHandler<HTMLElement>;
}) {
  const overrides = usePreviewSlotStyle(cardId);
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    /* Only the surface's own Enter: a slot inside has its own. */
    if (event.target !== event.currentTarget) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onInspect(cardId);
  };
  return (
    <Tag
      {...rest}
      className={className}
      data-preview-slot={cardId}
      style={overrides}
      tabIndex={0}
      onClick={(event) => {
        /* A field is typed in: the press that lands in it is not a pick. */
        if ((event.target as HTMLElement).closest("input, textarea, select")) {
          return;
        }
        onInspect(cardId);
      }}
      onKeyDown={onKeyDown}
    >
      {children}
    </Tag>
  );
}
