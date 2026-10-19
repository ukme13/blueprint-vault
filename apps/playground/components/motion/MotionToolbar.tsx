"use client";

import { IconButton } from "@astryxdesign/core/IconButton";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import { Redo2, RotateCcw, SlidersHorizontal, Undo2 } from "lucide-react";
import { Button, MOTION_SPEEDS, type MotionSpeed } from "@blueprint/ui";
import type { MotionHistoryBinding } from "./use-motion-history";
import styles from "./motion-studio.module.css";

/** `1x`, `0.5x`, `0.25x`: how a speed is named on the toggle. */
export const speedLabel = (speed: MotionSpeed) => `${speed}x`;

/**
 * Undo and redo, the playback speed, and Replay, which plays every moment on
 * the stage again. On a phone the settings are a sheet, opened from here.
 */
export function MotionToolbar({
  history,
  speed,
  onSpeedChange,
  onReplay,
  onOpenSettings,
}: {
  history: MotionHistoryBinding;
  speed: MotionSpeed;
  onSpeedChange: (speed: MotionSpeed) => void;
  onReplay: () => void;
  onOpenSettings: () => void;
}) {
  return (
    <section aria-label="Motion toolbar" className={styles.toolbar}>
      <span className={styles.historyButtons}>
        <IconButton
          icon={<Undo2 aria-hidden className="size-3.5" />}
          isDisabled={!history.canUndo}
          label="Undo"
          size="sm"
          tooltip="Undo"
          variant="ghost"
          onClick={history.undo}
        />
        <IconButton
          icon={<Redo2 aria-hidden className="size-3.5" />}
          isDisabled={!history.canRedo}
          label="Redo"
          size="sm"
          tooltip="Redo"
          variant="ghost"
          onClick={history.redo}
        />
      </span>
      <SegmentedControl
        label="Playback speed"
        size="sm"
        value={String(speed)}
        onChange={(value) => onSpeedChange(Number(value) as MotionSpeed)}
      >
        {MOTION_SPEEDS.map((each) => (
          <SegmentedControlItem
            key={each}
            label={speedLabel(each)}
            value={String(each)}
          />
        ))}
      </SegmentedControl>
      <Button
        leftIcon={<RotateCcw aria-hidden className="size-3.5" />}
        scheme="neutral"
        size="small"
        variant="outlined"
        onClick={onReplay}
      >
        Replay
      </Button>
      <span className={styles.settingsTrigger}>
        <IconButton
          icon={<SlidersHorizontal aria-hidden className="size-4" />}
          label="Motion settings"
          size="md"
          variant="secondary"
          onClick={onOpenSettings}
        />
      </span>
    </section>
  );
}
