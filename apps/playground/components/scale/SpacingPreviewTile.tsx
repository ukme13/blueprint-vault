"use client";

import { Fragment, type CSSProperties, type ReactNode } from "react";
import {
  ArrowLeftRight,
  ArrowUpDown,
  Box,
  Palette,
  type LucideIcon,
} from "lucide-react";
import { Button, type SpacingToken } from "@blueprint/ui";
import styles from "./scale-workspace.module.css";

/** The three ways a layout spends spacing, each set on its own step. */
export type SpacingSlot = "inset" | "stack" | "columns";

export const SPACING_SLOTS: readonly {
  slot: SpacingSlot;
  label: string;
  icon: LucideIcon;
  /** Where each starts: 24px inset, 8px stack, 16px columns on a 4px grid. */
  step: number;
}[] = [
  { slot: "inset", label: "Inset", icon: Box, step: 6 },
  { slot: "stack", label: "Stack", icon: ArrowUpDown, step: 2 },
  { slot: "columns", label: "Columns", icon: ArrowLeftRight, step: 4 },
];

const CARDS = [
  {
    icon: Box,
    title: "Design Tokens",
    body: "Consistent spacing creates harmonious visual rhythm across all components.",
    action: "Explore Tokens",
  },
  {
    icon: Palette,
    title: "Theme Engine",
    body: "Dynamic OKLCH color palettes with stable 25-grid intervals.",
    action: "View Palettes",
  },
];

interface SpacingPreviewTileProps {
  /** The step each slot is set to. */
  tokens: Record<SpacingSlot, SpacingToken>;
  /** The slot being set, named in the caption. */
  active: SpacingSlot;
  density: number;
}

/**
 * Two real cards, spending spacing the three ways a layout does at once:
 * each card padded by Inset, its title, text and button apart by Stack, and
 * the cards apart by Columns — each on a step of its own, since a card is
 * rarely padded by the gap it stacks with.
 *
 * Every space is drawn at its real size and marked as a box model
 * inspector marks it: tinted, edged with a dashed line, and tagged with its
 * size. The first card carries the Inset and Stack tags; the second shows
 * the same spaces untagged, so the tags do not crowd the content.
 *
 * On a phone the cards stack and the column gap runs between them
 * vertically, the way a responsive grid folds.
 */
export function SpacingPreviewTile({
  tokens,
  active,
  density,
}: SpacingPreviewTileProps) {
  const px = (slot: SpacingSlot) => `${tokens[slot].px}px`;
  const tag = (slot: SpacingSlot) => (
    <span className={styles.spacingTag}>{px(slot)}</span>
  );
  /* A gap drawn as an element of its own, so it can be seen: a flex gap is
     empty space, and empty space has no tint. */
  const stacked = (items: ReactNode[], tagged: boolean) =>
    items.map((item, index) => (
      <Fragment key={index}>
        {index > 0 ? (
          <span
            className={styles.spacingZone}
            data-spacing-zone="stack"
            style={{ height: px("stack") }}
          >
            {tagged ? tag("stack") : null}
          </span>
        ) : null}
        {item}
      </Fragment>
    ));
  const activeToken = tokens[active];

  return (
    <figure
      aria-label="Spacing preview"
      className={styles.spacingPreview}
      data-active-slot={active}
    >
      <div className={styles.spacingCards}>
        {CARDS.map((card, index) => {
          const Icon = card.icon;
          const tagged = index === 0;
          return (
            <Fragment key={card.title}>
              {index > 0 ? (
                <span
                  className={`${styles.spacingZone} ${styles.spacingColumnGap}`}
                  data-spacing-zone="columns"
                  style={{ "--column-gap": px("columns") } as CSSProperties}
                >
                  {tag("columns")}
                </span>
              ) : null}
              <div
                className={`${styles.spacingZone} ${styles.spacingInset}`}
                data-spacing-zone="inset"
                style={{ padding: px("inset") }}
              >
                {tagged ? tag("inset") : null}
                <div className={styles.spacingCardBody}>
                  {stacked(
                    [
                      <h3 key="title" className={styles.spacingCardTitle}>
                        <Icon aria-hidden="true" />
                        {card.title}
                      </h3>,
                      <p key="body" className={styles.spacingCardText}>
                        {card.body}
                      </p>,
                      <span key="action">
                        <Button
                          scheme="neutral"
                          size="medium"
                          type="button"
                          variant="outlined"
                        >
                          {card.action}
                        </Button>
                      </span>,
                    ],
                    tagged,
                  )}
                </div>
              </div>
            </Fragment>
          );
        })}
      </div>
      {/* The step being set, and what density does to it. */}
      <figcaption className={styles.spacingCaption} data-density-caption="">
        {`${SPACING_SLOTS.find((each) => each.slot === active)?.label}: `}
        {activeToken.followsDensity
          ? `${activeToken.variable} · layout step, ${density}× density`
          : `${activeToken.variable} · fine grid, fixed at any density`}
      </figcaption>
    </figure>
  );
}
