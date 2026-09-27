"use client";

import { Fragment, type CSSProperties, type ReactNode } from "react";
import {
  ArrowLeftRight,
  ArrowUpDown,
  Box,
  type LucideIcon,
} from "lucide-react";
import type { SpacingSlot, SpacingToken } from "@blueprint/ui";
import { PROFILE_CARD, WELCOME_CARD } from "./SpacingPreviewCards";
import styles from "./scale-workspace.module.css";

/** How each spacing slot is named and drawn; its steps are packages/ui's. */
export const SPACING_SLOTS: readonly {
  slot: SpacingSlot;
  label: string;
  icon: LucideIcon;
}[] = [
  { slot: "inset", label: "Inset", icon: Box },
  { slot: "stack", label: "Stack", icon: ArrowUpDown },
  { slot: "columns", label: "Columns", icon: ArrowLeftRight },
];

const CARDS = [WELCOME_CARD, PROFILE_CARD];

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
 * Every space is drawn at its real size and marked the way Figma's
 * inspector marks it: padding hatched in blue, gaps hatched in pink, each
 * with a dashed edge and a tag of its size. A tag never sits on content: a
 * column gap's is centred in its band, which holds nothing, but a stack gap
 * is often thinner than its tag, so its tag sits past the band's right end,
 * and the inset's sits outside the card's left edge. The first card carries
 * the Inset and Stack tags; the second shows the same spaces untagged.
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
  /* Where each tag sits, clear of any content. */
  const TAG_PLACE: Record<SpacingSlot, string | undefined> = {
    inset: styles.spacingTagInset,
    stack: styles.spacingTagSide,
    columns: undefined,
  };
  const tag = (slot: SpacingSlot) => (
    <span
      className={[styles.spacingTag, TAG_PLACE[slot]].filter(Boolean).join(" ")}
      data-spacing-tag={slot}
    >
      {px(slot)}
    </span>
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
      /* The inset, for placing the stack tags just outside the card. */
      style={{ "--inset": px("inset") } as CSSProperties}
    >
      <div className={styles.spacingCards}>
        {CARDS.map((card, index) => {
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
                  {stacked(card.blocks, tagged)}
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
