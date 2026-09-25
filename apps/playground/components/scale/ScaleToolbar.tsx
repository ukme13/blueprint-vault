"use client";

import { IconButton } from "@astryxdesign/core/IconButton";
import { Redo2, SlidersHorizontal, Undo2 } from "lucide-react";
import type { ScaleHistoryBinding } from "./use-scale-history";
import styles from "./scale-workspace.module.css";

/**
 * Undo and redo, and on a phone the way to the settings sheet. CSS shows the
 * settings button only on a phone; it is left out altogether in a view with
 * no settings panel.
 */
export function ScaleToolbar({
  history,
  settingsLabel,
  onOpenSettings,
}: {
  history: ScaleHistoryBinding;
  /** Omitted in a view with no settings to open. */
  settingsLabel?: string;
  onOpenSettings: () => void;
}) {
  return (
    <section aria-label="Scale toolbar" className={styles.toolbar}>
      <span className={styles.historyButtons}>
        <IconButton
          isDisabled={!history.canUndo}
          icon={<Undo2 aria-hidden className="size-3.5" />}
          label="Undo"
          tooltip="Undo"
          size="sm"
          variant="ghost"
          onClick={history.undo}
        />
        <IconButton
          isDisabled={!history.canRedo}
          icon={<Redo2 aria-hidden className="size-3.5" />}
          label="Redo"
          tooltip="Redo"
          size="sm"
          variant="ghost"
          onClick={history.redo}
        />
      </span>
      {settingsLabel ? (
        <span className={styles.settingsTrigger}>
          <IconButton
            icon={<SlidersHorizontal aria-hidden className="size-4" />}
            label={settingsLabel}
            size="md"
            variant="secondary"
            onClick={onOpenSettings}
          />
        </span>
      ) : null}
    </section>
  );
}
