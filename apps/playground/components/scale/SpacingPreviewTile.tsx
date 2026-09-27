"use client";

import { Fragment } from "react";
import { Box, Columns3, Rows3, type LucideIcon } from "lucide-react";
import type { SpacingToken } from "@blueprint/ui";
import styles from "./scale-workspace.module.css";

export type SpacingPreviewMode = "inset" | "stack" | "columns";

export const SPACING_PREVIEW_MODES: readonly {
  value: SpacingPreviewMode;
  label: string;
  icon: LucideIcon;
}[] = [
  { value: "inset", label: "Inset", icon: Box },
  { value: "stack", label: "Stack", icon: Rows3 },
  { value: "columns", label: "Columns", icon: Columns3 },
];

interface SpacingPreviewTileProps {
  mode: SpacingPreviewMode;
  token: SpacingToken;
  /** The scale's density, named on a step it moves. */
  density: number;
}

/**
 * One spacing step, used the way a layout uses it: as a card's padding
 * (Inset), as the gap between stacked blocks (Stack), or as the gap between
 * columns (Columns). The space itself is marked the way a browser's box
 * model inspector marks it — tinted, edged with a dashed line, and labelled
 * with its size — so it is the step being shown, not the blocks around it.
 *
 * The step is drawn at its real size in pixels, not scaled, so what reads as
 * roomy here is roomy in a page.
 */
export function SpacingPreviewTile({
  mode,
  token,
  density,
}: SpacingPreviewTileProps) {
  const size = `${token.px}px`;
  const tag = <span className={styles.spacingTag}>{size}</span>;
  /* Which kind of step this is: one density moves, or one on the fine
     grid that stays put at any density. */
  const caption = (
    <figcaption className={styles.spacingCaption} data-density-caption="">
      {token.followsDensity
        ? `${token.variable} · layout step, ${density}× density`
        : `${token.variable} · fine grid, fixed at any density`}
    </figcaption>
  );

  if (mode === "inset") {
    return (
      <figure
        aria-label={`${token.variable} as padding`}
        className={styles.spacingPreview}
        data-preview-mode="inset"
      >
        <div
          className={`${styles.spacingZone} ${styles.spacingInset}`}
          data-spacing-zone=""
          style={{ padding: size }}
        >
          {tag}
          <div className={styles.spacingContent}>
            <span className={styles.spacingLine} />
            <span className={`${styles.spacingLine} ${styles.spacingShort}`} />
          </div>
        </div>
        {caption}
      </figure>
    );
  }

  const isStack = mode === "stack";
  const items = isStack
    ? [
        <span key="title" className={styles.spacingTitle} />,
        <span key="text" className={styles.spacingParagraph}>
          <span className={styles.spacingLine} />
          <span className={styles.spacingLine} />
          <span className={`${styles.spacingLine} ${styles.spacingShort}`} />
        </span>,
        <span key="action" className={styles.spacingAction} />,
      ]
    : [0, 1, 2].map((index) => (
        <span key={index} className={styles.spacingColumn}>
          <span className={styles.spacingTitle} />
          <span className={styles.spacingLine} />
          <span className={`${styles.spacingLine} ${styles.spacingShort}`} />
        </span>
      ));

  return (
    <figure
      aria-label={`${token.variable} as ${isStack ? "a stack gap" : "a column gap"}`}
      className={styles.spacingPreview}
      data-preview-mode={mode}
    >
      <div className={isStack ? styles.spacingStack : styles.spacingColumns}>
        {items.map((item, index) => (
          <Fragment key={index}>
            {index > 0 ? (
              /* The gap drawn as an element of its own, so it can be seen:
                 a flex gap is empty space, and empty space has no tint. */
              <span
                className={styles.spacingZone}
                data-spacing-zone=""
                style={isStack ? { height: size } : { width: size }}
              >
                {tag}
              </span>
            ) : null}
            {item}
          </Fragment>
        ))}
      </div>
      {caption}
    </figure>
  );
}
