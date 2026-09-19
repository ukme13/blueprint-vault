"use client";

import Link from "next/link";
import { DropdownMenu } from "@astryxdesign/core/DropdownMenu";
import { DEFAULT_WORKSPACE_NAME, type PaletteProjectData } from "@blueprint/ui";
import { ProjectMosaic } from "./ProjectMosaic";
import styles from "./home.module.css";

function familyCountLabel(count: number) {
  if (count === 1) return "1 colour family";
  return `${count} colour families`;
}

/**
 * One workspace on Home: mosaic, name, open on click, Duplicate / Delete
 * in the overflow menu so the card itself stays the switcher.
 */
export function ProjectCard({
  familyCount,
  href,
  isCurrent,
  isLibraryFull,
  name,
  palette,
  onDelete,
  onDuplicate,
  onOpen,
}: {
  familyCount: number;
  href: string;
  isCurrent: boolean;
  isLibraryFull: boolean;
  name: string;
  palette: PaletteProjectData | null | undefined;
  onDelete: () => void;
  onDuplicate: () => void;
  onOpen: () => void;
}) {
  const title = name || DEFAULT_WORKSPACE_NAME;

  return (
    <div
      className={
        isCurrent ? `${styles.card} ${styles.cardCurrent}` : styles.card
      }
    >
      <Link className={styles.cardLink} href={href} onClick={onOpen}>
        <ProjectMosaic palette={palette} />
        <h2>{title}</h2>
        <p>
          {isCurrent ? "Current · " : null}
          {familyCountLabel(familyCount)}
        </p>
      </Link>
      <div className={styles.cardMenu}>
        <DropdownMenu
          alignment="end"
          button={{
            "aria-label": `Actions for ${title}`,
            label: "…",
            size: "sm",
            variant: "ghost",
          }}
          hasChevron={false}
          items={[
            {
              label: "Duplicate",
              isDisabled: isLibraryFull,
              onClick: onDuplicate,
            },
            {
              label: "Delete",
              onClick: onDelete,
              variant: "destructive",
            },
          ]}
          menuWidth={180}
          placement="below"
        />
      </div>
    </div>
  );
}
