"use client";

import Link from "next/link";
import { Copy, Download, Pencil, Trash2 } from "lucide-react";
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
 * One workspace on Home:
 * Flush top mosaic thumbnail, overlay action icons (Rename, Duplicate, Delete)
 * with a faded top gradient, and project details below.
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
        <div className={styles.cardActionsOverlay}>
          <button
            aria-label={`Rename ${title}`}
            className={styles.cardActionButton}
            title="Rename project"
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onRename();
            }}
          >
            <Pencil size={15} strokeWidth={2.2} />
          </button>
          <button
            aria-label={`Duplicate ${title}`}
            className={styles.cardActionButton}
            disabled={isLibraryFull}
            title={
              isLibraryFull
                ? "Workspace limit reached (8 projects)"
                : "Duplicate project"
            }
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onDuplicate();
            }}
          >
            <Copy size={15} strokeWidth={2.2} />
          </button>
          <button
            aria-label={`Export ${title}`}
            className={styles.cardActionButton}
            title="Export project (.blueprint.json)"
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onExport();
            }}
          >
            <Download size={15} strokeWidth={2.2} />
          </button>
          <button
            aria-label={`Delete ${title}`}
            className={`${styles.cardActionButton} ${styles.cardActionButtonDestructive}`}
            title="Delete project"
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 size={15} strokeWidth={2.2} />
          </button>
        </div>
      </div>
      <div className={styles.cardContent}>
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
        <p>
          {familyCountLabel(familyCount)}
          {editedText ? ` · ${editedText}` : null}
        </p>
      </div>
    </div>
  );
}
