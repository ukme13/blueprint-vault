"use client";

import Link from "next/link";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { HStack } from "@astryxdesign/core/Layout";
import { PanelLeftClose } from "lucide-react";
import { BlueprintLetters, BlueprintMark } from "./shell-marks";
import styles from "./rail-brand.module.css";

/**
 * Gemini-style rail brand.
 *
 * Open: wordmark (monogram + name) goes Home; a panel control on the right collapses the rail.
 * Closed: the B monogram is the expand control.
 * Transition: the B monogram stays visible continuously while the name and collapse button fade out.
 */
export function RailBrand({
  collapsed,
  isNavCollapsed = collapsed,
  onCollapsedChange,
}: {
  collapsed: boolean;
  isNavCollapsed?: boolean;
  onCollapsedChange: (next: boolean) => void;
}) {
  if (isNavCollapsed) {
    return (
      <IconButton
        className={styles.collapsedTrigger}
        icon={<Icon icon={BlueprintMark} size="lg" />}
        label="Expand sidebar"
        tooltip="Expand sidebar"
        variant="ghost"
        size="lg"
        onClick={() => onCollapsedChange(false)}
      />
    );
  }

  return (
    <div className={styles.brandContainer} data-collapsing={collapsed}>
      <HStack
        gap={2}
        hAlign="between"
        vAlign="center"
        className={styles.brandRow}
      >
        <Link aria-label="Blueprint" className={styles.homeLink} href="/">
          <span className={styles.monogram}>
            <Icon icon={BlueprintMark} size="lg" />
          </span>
          <BlueprintLetters className={styles.brandLetters} />
        </Link>
        <IconButton
          className={styles.collapseButton}
          icon={<Icon icon={PanelLeftClose} size="md" />}
          label="Collapse sidebar"
          tooltip="Collapse sidebar"
          variant="ghost"
          size="md"
          onClick={() => onCollapsedChange(true)}
        />
      </HStack>
    </div>
  );
}
