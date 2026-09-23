"use client";

import Link from "next/link";
import { DropdownMenu } from "@astryxdesign/core/DropdownMenu";
import { Copy, Download, Ellipsis, Pencil, Trash2 } from "lucide-react";
import {
  DEFAULT_WORKSPACE_NAME,
  formatRelativeTime,
  type PaletteProjectData,
} from "@blueprint/ui";
import { ProjectMosaic } from "./ProjectMosaic";
import styles from "./home.module.css";

function familyCountLabel(count: number) {
  if (count === 1) return "1 colour family";
  return `${count} colour families`;
}

/**
 * One workspace on Home: the palette mosaic, then its name, what it holds and
 * when it was last touched, with its actions in one `···` menu.
 *
 * The actions used to be four icons laid over the mosaic, shown on hover —
 * which a phone does not have, so they sat there permanently, small and over
 * the palette. One menu beside the name keeps the mosaic clear and gives each
 * action a row a thumb can hit.
 *
 * The whole card opens the project: the link's hit area covers it. The menu
 * sits above that area, so pressing it opens the menu and not the project.
 */
export function ProjectCard({
  familyCount,
  href,
  isCurrent,
  isLibraryFull,
  name,
  palette,
  updatedAt,
  onDelete,
  onDuplicate,
  onExport,
  onOpen,
  onRename,
}: {
  familyCount: number;
  href: string;
  isCurrent: boolean;
  isLibraryFull: boolean;
  name: string;
  palette: PaletteProjectData | null | undefined;
  updatedAt?: number;
  onDelete: () => void;
  onDuplicate: () => void;
  onExport: () => void;
  onOpen: () => void;
  onRename: () => void;
}) {
  const title = name || DEFAULT_WORKSPACE_NAME;
  const editedText = formatRelativeTime(updatedAt);

  return (
    <div
      className={
        isCurrent ? `${styles.card} ${styles.cardCurrent}` : styles.card
      }
    >
      <div className={styles.thumbnailWrapper}>
        <ProjectMosaic palette={palette} />
      </div>
      <div className={styles.cardContent}>
        <div className={styles.cardTitleRow}>
          <h2>
            <Link
              aria-current={isCurrent ? "page" : undefined}
              className={styles.cardLink}
              href={href}
              onClick={onOpen}
            >
              <span aria-hidden className={styles.cardLinkHitArea} />
              {title}
            </Link>
          </h2>
          <span className={styles.cardMenu}>
            <DropdownMenu
              alignment="end"
              button={{
                label: `More actions for ${title}`,
                icon: <Ellipsis aria-hidden className="size-4" />,
                isIconOnly: true,
                size: "sm",
                variant: "ghost",
              }}
              hasChevron={false}
              items={[
                {
                  label: "Rename",
                  icon: <Pencil aria-hidden className="size-4" />,
                  onClick: onRename,
                },
                {
                  label: "Duplicate",
                  icon: <Copy aria-hidden className="size-4" />,
                  description: isLibraryFull
                    ? "The library is full (8 projects)"
                    : undefined,
                  isDisabled: isLibraryFull,
                  onClick: onDuplicate,
                },
                {
                  label: "Export",
                  icon: <Download aria-hidden className="size-4" />,
                  onClick: onExport,
                },
                { type: "divider" },
                {
                  label: "Delete",
                  icon: <Trash2 aria-hidden className="size-4" />,
                  variant: "destructive",
                  onClick: onDelete,
                },
              ]}
              menuWidth={200}
            />
          </span>
        </div>
        <p className={styles.cardMeta}>
          <span className={styles.cardBadge}>
            {familyCountLabel(familyCount)}
          </span>
          {editedText ? (
            <span className={styles.cardBadge}>{editedText}</span>
          ) : null}
        </p>
      </div>
    </div>
  );
}
