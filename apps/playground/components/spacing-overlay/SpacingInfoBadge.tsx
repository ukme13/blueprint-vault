"use client";

import { useState } from "react";
import Link from "next/link";
import { Text } from "@astryxdesign/core/Text";
import { spacingTokenForPx, type SpacingScale } from "@blueprint/ui";
import { PopoverOrSheet } from "../PopoverOrSheet";
import styles from "./spacing-overlay.module.css";

/**
 * A size tag on a space no layout use sizes: a button's padding, an icon's
 * gap. It is set by the page's own styles, so there is nothing to rebind
 * here; a click says which spacing step it is, and its px, and offers the
 * Spacing studio, where that step's size is changed for everything using
 * it at once.
 */
export function SpacingInfoBadge({
  px,
  spacing,
}: {
  px: number;
  spacing: SpacingScale;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const token = spacingTokenForPx(spacing, px);
  const size = `${Math.round(px)}px`;
  const label = token ? `${token.variable}, ${size}` : `${size}, between steps`;

  return (
    <PopoverOrSheet
      isOpen={isOpen}
      label={label}
      trigger={
        <button
          aria-label={`${label}. About this space`}
          className={styles.badge}
          data-info=""
          type="button"
        >
          {size}
        </button>
      }
      width={240}
      onOpenChange={setIsOpen}
    >
      <section aria-label={label} className={styles.info}>
        <Text type="label" weight="semibold">
          {token ? token.variable : "Between steps"}
        </Text>
        <Text type="supporting">
          {token
            ? `${size}. Set by the page's own styles, not a layout use, so its size follows the step.`
            : `${size}. A step times a factor, or a size in px: no single step to change.`}
        </Text>
        {token ? (
          <Link className={styles.infoLink} href="/spacing">
            Tune {token.variable} in Spacing
          </Link>
        ) : null}
      </section>
    </PopoverOrSheet>
  );
}
